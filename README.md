# ブラックボックスを開けよう（Open the Black Box）

英語の授業プロジェクト（論文テーマ：*people fear AI because they do not understand how it is made*）に合わせた体験型Webアプリです。

5分でこの順に体験できます。

1. **体験前アンケート**：AIへの不安を3問、1〜5で答える
2. **AIを育てる**（論文 Body 1：学習データ）：偏ったデータ／バランスのとれたデータで採用AIに学習させる
3. **中をのぞく**（論文 Body 2：ブラックボックス）：1語だけ違う履歴書を判定させ、判定に効いた単語を色付きで見る
4. **体験後アンケート**（論文 Body 3：AIリテラシー）：同じ3問に答え、前後の変化を見る。回答は匿名でサーバーに保存される

`/#stats` を開くと、全員の回答の前後の平均が見られます（発表・論文用）。

## 構成

```
web/       フロントエンド（Vite + React + TypeScript）
  src/lib/classifier.ts       ★ AIの中身。ここを自分で実装する
  src/lib/classifier.test.ts  classifier.ts が正しいか確かめるテスト
  src/lib/text.ts             日本語を単語に分ける補助関数（用意済み）
  src/data/                   履歴書データとアンケートの質問
  src/components/             各画面
  src/api.ts                  Goサーバーとの通信
server/    バックエンド（Go。外部ライブラリは Postgres ドライバ pgx のみ）
  handlers.go                 API（回答の保存・集計）
  store.go                    回答の保存先：JSON Lines ファイル（ローカル開発用）
  store_postgres.go           回答の保存先：PostgreSQL（本番用。DATABASE_URL があると使う）
  main.go                     起動・設定
```

## 自分で実装するところ

`web/src/lib/classifier.ts` の3つの関数です。コメントに手順と計算式を書いてあります。

| 関数 | やること |
| --- | --- |
| `tokenize(text)` | 文章を単語の配列にする |
| `train(resumes)` | 採用・不採用の履歴書から、単語ごとの重みを学習する |
| `judge(model, text)` | 新しい履歴書が採用される確率（0〜1）を出す |

テストが全部通れば完成です。

```bash
cd web
npm test            # 1回だけ実行
npm run test:watch  # 保存するたびに自動で実行
```

実装するまでは、画面で「AIに学習させる」を押すと「まだ実装されていません」と表示されます。

## 動かし方

必要なもの：Node.js 20以上、Go 1.25以上

```bash
# ターミナル1：Goサーバー（http://localhost:8080）
cd server
go run .

# ターミナル2：フロントエンド（http://localhost:5173）
cd web
npm install
npm run dev
```

開発中は、フロントの `/api` へのリクエストが自動でGoサーバーに転送されます（`web/vite.config.ts`）。

### テスト

```bash
cd server && go test ./...
cd web && npm test
```

Postgres 版の保存処理もテストするときは、テスト用の空のDBを用意して `TEST_DATABASE_URL` を指定します（テストのたびにテーブルを空にするので、本番のDBは指定しないこと）。

```bash
createdb blackbox_test
cd server && TEST_DATABASE_URL=postgres://localhost:5432/blackbox_test go test ./...
```

## API

| メソッド | パス | 内容 |
| --- | --- | --- |
| `GET` | `/api/health` | 動作確認 |
| `POST` | `/api/responses` | 回答を1件保存 |
| `GET` | `/api/stats` | 回答数と、体験前・後の平均 |

`POST /api/responses` の例：

```json
{
  "id": "ランダムなUUID",
  "dataset": "B",
  "pre":  { "scary": 4, "understand": 1, "fixable": 2 },
  "post": { "scary": 2, "understand": 4, "fixable": 5 }
}
```

回答は1〜5のみ受け付けます。名前などの個人情報は保存しません。

## 公開するとき

一番簡単なのは、Goサーバー1つでフロントもAPIも配信する方法です。

```bash
cd web && npm run build
cd ../server && STATIC_DIR=../web/dist go run .
```

Render や Fly.io などGoを動かせるサービスにそのまま置けます。ただし再起動でファイルが消えるサービスでは、`DATABASE_URL` を設定して回答を PostgreSQL に保存してください。

フロントを Vercel などに別で置く場合は、フロントのビルド時に `VITE_API_URL`（GoサーバーのURL）を、Goサーバーに `ALLOWED_ORIGIN`（フロントのURL）を設定します。

| 環境変数（server） | 既定値 | 内容 |
| --- | --- | --- |
| `PORT` | `8080` | 待ち受けポート |
| `DATABASE_URL` | なし | 指定すると回答を PostgreSQL に保存 |
| `DATA_FILE` | `responses.jsonl` | `DATABASE_URL` がないときの保存先ファイル |
| `STATIC_DIR` | なし | 指定するとビルド済みフロントも配信 |
| `ALLOWED_ORIGIN` | なし | 別ドメインのフロントからのアクセスを許可 |

## 注意

- 履歴書はすべて架空のサンプルデータです。
- 単語の分け方は「文字の種類が変わるところで区切る」簡易版です。漢字が続くと1語にくっつくので（例：「女子文芸部」）、データを足すときは「男子」「女子」の直後にカタカナの語を置いてください。
