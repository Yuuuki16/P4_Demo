/** 学習データ1件分。hired が true なら「採用」された履歴書 */
export type Resume = {
  text: string
  hired: boolean
}

/** データセット（A: 偏った過去の判断 / B: バランスのとれた判断） */
export type DatasetId = 'A' | 'B'

export type Dataset = {
  id: DatasetId
  name: string
  note: string
  resumes: Resume[]
}

/**
 * 学習済みモデル。
 * - weights: 単語ごとの重み。プラスなら「採用」寄り、マイナスなら「不採用」寄り
 * - prior:   何も読まない状態での採用されやすさ（事前の傾き）
 */
export type Model = {
  weights: Record<string, number>
  prior: number
}

export type QuestionId = 'scary' | 'understand' | 'fixable'

/** アンケートの回答。各質問に 1〜5 */
export type Answers = Record<QuestionId, number>
