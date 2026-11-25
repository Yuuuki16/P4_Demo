import { useEffect, useState } from 'react'
import { fetchStats, type Stats } from '../api'
import { QUESTIONS } from '../data/questions'
import { Bar } from './ResultStep'
import { jp } from '../lib/jp'

/** #stats で開く集計ページ。発表や論文に使う「前後の平均」を表示する */
export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats().then(setStats).catch((e: Error) => setError(e.message))
  }, [])

  return jp(
    <section>
      <div className="hero">
        <div className="icon" aria-hidden="true">📊</div>
        <h2>みんなの回答</h2>
        <p className="lead">体験の前と後で、AIへの気持ちがどう変わったかを1〜5の平均で示しています。</p>
      </div>
      {error && <div className="status error">{error}</div>}
      {!stats && !error && <p className="mute">読み込み中…</p>}
      {stats && stats.count === 0 && <p className="mute">まだ回答がありません。</p>}
      {stats && stats.count > 0 && (
        <>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="big-number">{stats.count}</div>
            <div className="small">人が回答しました</div>
          </div>
          <div className="res">
            {QUESTIONS.map((q) => {
              const d = stats.post[q.id] - stats.pre[q.id]
              return (
                <div className="card" key={q.id}>
                  <p className="qtitle">
                    {q.text} <span className="delta">{d > 0 ? '+' : ''}{d.toFixed(2)}</span>
                  </p>
                  <Bar label="前" value={stats.pre[q.id]} color="var(--pre)" decimals />
                  <Bar label="後" value={stats.post[q.id]} color="var(--post)" decimals />
                </div>
              )
            })}
          </div>
        </>
      )}
      <div className="cta">
        <a className="ghost block" href="#">
          ← 体験ページに戻る
        </a>
      </div>
    </section>
  )
}
