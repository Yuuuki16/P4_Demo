import type { Answers, DatasetId, QuestionId } from './lib/types'

// 開発中は vite.config.ts のプロキシで /api → Goサーバー(localhost:8080)に転送される。
// 本番でフロントとAPIを別のドメインに置くときは VITE_API_URL を設定する。
const BASE = import.meta.env.VITE_API_URL ?? ''

export type ResponsePayload = {
  id: string
  dataset: DatasetId | null
  pre: Answers
  post: Answers
}

export type QuestionStats = {
  id: QuestionId
  pre: number
  post: number
  /** 差（後 − 前）の平均 */
  diff: number
  sd: number
  /** 1〜5 を選んだ人数（添字 0 が 1） */
  preDist: number[]
  postDist: number[]
  up: number
  same: number
  down: number
  /** 回答が2件未満のときは null */
  t: number | null
  p: number | null
  effect: number | null
}

export type DatasetStats = {
  dataset: DatasetId | '-'
  count: number
  diff: Record<QuestionId, number>
}

export type Stats = {
  count: number
  pre: Record<QuestionId, number>
  post: Record<QuestionId, number>
  questions: QuestionStats[]
  datasets: DatasetStats[]
  lastResponseAt: string | null
}

export async function submitResponse(payload: ResponsePayload): Promise<void> {
  const res = await fetch(`${BASE}/api/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`保存に失敗しました (${res.status})`)
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${BASE}/api/stats`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`集計の取得に失敗しました (${res.status})`)
  return res.json()
}
