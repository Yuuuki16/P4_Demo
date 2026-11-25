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
  const words = splitPieces(text)
    .filter(isWord)
    .map((w) => w.toLowerCase())
  return [...new Set(words)]
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
  // (1)(2) 採用・不採用それぞれで「その単語が出てきた履歴書の件数」を数える
  const hiredCounts = new Map<string, number>()
  const rejectedCounts = new Map<string, number>()
  let hiredTotal = 0
  let rejectedTotal = 0
  for (const r of resumes) {
    const counts = r.hired ? hiredCounts : rejectedCounts
    if (r.hired) hiredTotal++
    else rejectedTotal++
    for (const w of tokenize(r.text)) counts.set(w, (counts.get(w) ?? 0) + 1)
  }

  // (3) 出てきた全単語の重み（ラプラス・スムージング付きの対数比）
  const weights: Record<string, number> = {}
  for (const w of new Set([...hiredCounts.keys(), ...rejectedCounts.keys()])) {
    weights[w] =
      Math.log(((hiredCounts.get(w) ?? 0) + 1) / (hiredTotal + 2)) -
      Math.log(((rejectedCounts.get(w) ?? 0) + 1) / (rejectedTotal + 2))
  }

  // (4) 事前の傾き
  const prior = Math.log(hiredTotal / rejectedTotal)
  return { weights, prior }
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
  let score = model.prior
  for (const w of tokenize(text)) {
    // "constructor" などの英単語で Object の組み込みプロパティを拾わないよう、自分のキーだけ見る
    if (Object.hasOwn(model.weights, w)) score += model.weights[w]
  }
  return 1 / (1 + Math.exp(-score))
}
