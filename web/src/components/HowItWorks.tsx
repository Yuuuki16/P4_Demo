import { DATASETS, TEST_RESUMES } from '../data/datasets'
import { judge, tokenize, train } from '../lib/classifier'
import type { PresetId } from '../lib/types'
import { jp } from '../lib/jp'

// 解説に出す数字は、ここで実際に学習させて計算する（文章と実際の動きがずれないように）
const modelA = train(DATASETS.A.resumes)
const modelB = train(DATASETS.B.resumes)
const [MEN, WOMEN] = TEST_RESUMES

const fmt = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(1)
const pct = (p: number) => `${Math.round(p * 100)}%`
const count = (id: PresetId, word: string, hired: boolean) =>
  DATASETS[id].resumes.filter((r) => r.hired === hired && r.text.includes(word)).length

/** 結果画面に出す「このAIはどうやって学んだのか」の解説 */
export function HowItWorks() {
  return jp(
    <div className="how">
      <div className="hero">
        <div className="icon" aria-hidden="true">🔍</div>
        <h2>このAIはどうやって学習したのか</h2>
        <p className="lead">
          中身は意外と単純で、<b>単語を数えて足し算している</b>だけです。数式を使わずに説明します。
        </p>
      </div>

      <div className="step">
        <h3>
          <span className="num">1</span>履歴書を単語に分ける
        </h3>
        <p>AIは文章の意味を理解していません。まずは文章を単語ごとに区切ります。</p>
        <p className="example">
          「{MEN}」
          <br />→ {tokenize(MEN).join(' / ')}
        </p>
        <p className="mute">
          助詞などのひらがなや句読点は取り除きます。AIにとって履歴書は、単語が詰まった袋のようなものです。
        </p>
      </div>

      <div className="step">
        <h3>
          <span className="num">2</span>採用と不採用に分けて、単語を数える
        </h3>
        <p>
          学習では、過去の履歴書を採用と不採用の2つに分け、それぞれに各単語が何回出てくるかを数えます。データAの場合は次のとおりです。
        </p>
        <div className="table-scroll">
          <table className="how-table">
            <thead>
              <tr>
                <th>単語</th>
                <th>採用</th>
                <th>不採用</th>
              </tr>
            </thead>
            <tbody>
              {['男子', '女子'].map((w) => (
                <tr key={w}>
                  <td>{w}</td>
                  <td>{count('A', w, true)}件</td>
                  <td>{count('A', w, false)}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="step">
        <h3>
          <span className="num">3</span>偏りを重みという数字に置き換える
        </h3>
        <p>
          採用された履歴書によく出る単語には<b>プラス</b>、不採用の履歴書によく出る単語には<b>マイナス</b>
          の点数を付けます。この点数を重みと呼びます。どちらにも同じくらい出る単語は<b>0に近く</b>
          なります。データAで学習した重みは次のとおりです。
        </p>
        <p className="example">
          男子 <b className="plus">{fmt(modelA.weights['男子'])}</b>　／　女子{' '}
          <b className="minus">{fmt(modelA.weights['女子'])}</b>　／　部 {fmt(modelA.weights['部'] ?? 0)}
        </p>
        <p className="mute">AIが覚えているのは、この単語と数字の一覧だけです。ルールや理由は何も覚えていません。</p>
      </div>

      <div className="step">
        <h3>
          <span className="num">4</span>新しい履歴書は重みを足して判定する
        </h3>
        <p>
          履歴書に出てくる単語の重みをすべて足して合計点を出し、それを採用される確率（0〜100%）に変換します。50%以上なら採用です。
        </p>
        <p>
          先ほどの2枚は男子と女子の1語しか違わないため、<b>結果の差は、この1語の重みの差だけ</b>で決まりました。
        </p>
        <div className="table-scroll">
          <table className="how-table">
            <thead>
              <tr>
                <th>学習データ</th>
                <th>男子の履歴書</th>
                <th>女子の履歴書</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A：過去の判断</td>
                <td>{pct(judge(modelA, MEN))}</td>
                <td>{pct(judge(modelA, WOMEN))}</td>
              </tr>
              <tr>
                <td>B：バランス</td>
                <td>{pct(judge(modelB, MEN))}</td>
                <td>{pct(judge(modelB, WOMEN))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="step">
        <h3>
          <span aria-hidden="true">🤔</span>なぜAIは性別で差をつけたのか
        </h3>
        <p>
          AIは、女性の能力が低いと考えたわけではありません。そもそも、AIは何も考えていません。
          データAでは過去に男性ばかりが採用されていたため、男子という語は採用の側に、女子という語は不採用の側に偏っていました。
          AIは<b>その偏りを、そのまま数字に写し取った</b>だけです。
        </p>
        <p>
          データBでは男女とも採用と不採用の両方にいるため、2つの語の重みは同じ（男子 {fmt(modelB.weights['男子'])}、女子{' '}
          {fmt(modelB.weights['女子'])}）になり、差は消えました。<b>AIを変えたのではなく、データを変えただけ</b>です。
        </p>
      </div>

      <div className="step">
        <h3>
          <span aria-hidden="true">📦</span>まとめ：ブラックボックスの中身
        </h3>
        <ul>
          <li>AIの学習とは、過去のデータに出てくるパターンを数え、数字の一覧にすること</li>
          <li>AIの判断とは、その数字を足し合わせること</li>
          <li>そのため、過去のデータに偏りがあれば、AIはその偏りまで正確に学んでしまう</li>
          <li>逆に言えば、仕組みがわかれば、直すべきところ（データ）もわかる</li>
        </ul>
      </div>
      <p className="small">
        ChatGPTのような実際のAIは、これよりはるかに大きく複雑です。それでも、過去のデータから傾向を数字として学ぶという
        基本の考え方は同じです。ここで使ったのは、ナイーブベイズと呼ばれる昔からある分類の方法です。
      </p>
    </div>
  )
}
