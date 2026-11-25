// ============================================================
//  ここがこのアプリの「AI」の中身です。3つの関数をあなたが実装します。
//  全部で15〜30行ほどです。
//
//  できたかどうかは、テストで確認できます：
//    cd web && npm test
//  10個のテストが全部通れば完成です。
// ============================================================

import type { Model, Resume } from './types'
import { isWord, splitPieces } from './text'

/**
 * 1. tokenize：文章を「単語の配列」にする
 *
 * - splitPieces(text) で文章をかたまりに分ける（text.ts に用意済み）
 * - isWord(piece) が true のものだけ残す（ひらがな・記号を捨てる）
 * - 英字は小文字にそろえる（"Python" と "python" を同じ単語として扱うため）
 * - 同じ単語は1回だけにする（ヒント：Set）
 *
 * 例: tokenize("男子チェス部に所属。Pythonで開発。")
 *     → ["男子", "チェス", "部", "所属", "python", "開発"]
 */
export function tokenize(text: string): string[] {
  // TODO: 実装する（実装したら下の void の行は消す）
  void [text, splitPieces, isWord]
  throw new Error('tokenize がまだ実装されていません（src/lib/classifier.ts）')
}

/**
 * 2. train：履歴書の山から、単語ごとの重みを学習する
 *
 * やること：
 * (1) 履歴書を「採用」と「不採用」の2グループに分ける
 * (2) それぞれのグループで、各単語が「何件の履歴書に出てきたか」を数える
 * (3) 出てきた全単語について重みを計算する
 *
 *     weight(単語) = log( (採用グループでの件数 + 1) / (採用の総数 + 2) )
 *                  - log( (不採用グループでの件数 + 1) / (不採用の総数 + 2) )
 *
 *     ・採用の履歴書によく出る単語ほどプラス、不採用によく出る単語ほどマイナスになる
 *     ・+1 と +2 は「一度も出てこない単語で 0 割りや log(0) にならないため」のおまじない
 *       （ラプラス・スムージングと呼ぶ）
 *
 * (4) prior = log(採用の総数 / 不採用の総数)
 *
 * 使うもの：Math.log、tokenize、Record<string, number>（単語 → 件数 の表）
 */
export function train(resumes: Resume[]): Model {
  // TODO: 実装する（実装したら下の void の行は消す）
  void resumes
  throw new Error('train がまだ実装されていません（src/lib/classifier.ts）')
}

/**
 * 3. judge：学習したモデルで、新しい履歴書の「採用される確率」を出す
 *
 * やること：
 * (1) score = prior から始める
 * (2) 履歴書を tokenize して、各単語の重みを score に足す
 *     （モデルが知らない単語は 0 として無視する）
 * (3) score を 0〜1 の確率に変換して返す（シグモイド関数）
 *
 *     probability = 1 / (1 + Math.exp(-score))
 *
 * 0.5 以上なら「採用」と表示されます。
 */
export function judge(model: Model, text: string): number {
  // TODO: 実装する（実装したら下の void の行は消す）
  void [model, text]
  throw new Error('judge がまだ実装されていません（src/lib/classifier.ts）')
}
