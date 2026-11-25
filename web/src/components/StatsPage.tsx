import { useEffect, useState } from 'react'
import { fetchStats, type Stats } from '../api'
import { QUESTIONS } from '../data/questions'
import { Bar } from './ResultStep'

/** #stats で開く集計ページ。発表や論文に使う「前後の平均」を表示する */
export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats().then(setStats).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <section>
      <h2>みんなの回答（集計）</h2>
      {error && <div className="status error">{error}</div>}
      {!stats && !error && <p className="mute">読み込み中…</p>}
      {stats && stats.count === 0 && <p className="mute">まだ回答がありません。</p>}
      {stats && stats.count > 0 && (
        <>
          <p>回答数：{stats.count}人（1〜5の平均）</p>
          <div className="res">
            {QUESTIONS.map((q) => {
              const d = stats.post[q.id] - stats.pre[q.id]
              return (
                <div className="card" key={q.id}>
                  <p className="qtitle">
                    {q.text} <span className="delta">{d > 0 ? '+' : ''}{d.toFixed(2)}</span>
                  </p>
                  <Bar label="前" value={stats.pre[q.id]} color="var(--dusk)" />
                  <Bar label="後" value={stats.post[q.id]} color="var(--rose)" />
                </div>
              )
            })}
          </div>
        </>
      )}
      <p className="row">
        <a href="#">← 体験ページに戻る</a>
      </p>
    </section>
  )
}
