import { useEffect, useState } from 'react'
import { fetchStats, type DatasetStats, type QuestionStats, type Stats } from '../api'
import { QUESTIONS } from '../data/questions'
import { Bar } from './ResultStep'
import { jp } from '../lib/jp'

/** 何秒ごとに集計を取り直すか */
const REFRESH_SECONDS = 5

const DATASET_NAMES: Record<DatasetStats['dataset'], string> = {
  A: 'A：過去の判断',
  B: 'B：バランス',
  C: 'C：自分で決めた',
  '-': 'データ未選択',
}

const SHORT: Record<QuestionStats['id'], string> = { scary: 'こわさ', understand: '分かる', fixable: '直せる' }

/**
 * #stats で開く集計ページ。発表や論文に使う。
 * 開いている間は数秒ごとに集計を取り直すので、回答が入るとすぐに反映される（画面を見ていないときは止める）。
 */
export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (document.visibilityState !== 'visible') return
      fetchStats()
        .then((s) => {
          if (cancelled) return
          setStats(s)
          setError(null)
          setUpdatedAt(new Date())
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message)
        })
    }
    load()
    const timer = setInterval(load, REFRESH_SECONDS * 1000)
    document.addEventListener('visibilitychange', load)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  return jp(
    <section>
      <div className="hero">
        <div className="icon" aria-hidden="true">📊</div>
        <h2>みんなの回答</h2>
        <p className="lead">体験の前と後で、AIへの気持ちがどう変わったかを分析しています。回答が届くと自動で更新されます。</p>
      </div>

      <p className="live" role="status">
        <span className="dot" aria-hidden="true" />
        {REFRESH_SECONDS}秒ごとに自動更新
        {updatedAt && `（最終更新 ${updatedAt.toLocaleTimeString('ja-JP')}）`}
      </p>

      {error && <div className="status error">集計を取得できませんでした。表示は前回の結果のままです。（{error}）</div>}
      {!stats && !error && <p className="mute">読み込み中…</p>}
      {stats && stats.count === 0 && <p className="mute">まだ回答がありません。</p>}

      {stats && stats.count > 0 && (
        <>
          <div className="card kpi">
            <div className="big-number">{stats.count}</div>
            <div className="small">
              人が回答しました
              {stats.lastResponseAt && `。最新の回答は${timeAgo(new Date(stats.lastResponseAt))}`}
            </div>
          </div>

          <div className="legend" aria-label="凡例">
            <span>
              <i style={{ background: 'var(--pre)' }} />
              体験前
            </span>
            <span>
              <i style={{ background: 'var(--post)' }} />
              体験後
            </span>
          </div>

          {stats.questions.map((q) => (
            <QuestionCard key={q.id} q={q} count={stats.count} />
          ))}

          {stats.datasets.length > 0 && <DatasetTable datasets={stats.datasets} />}

          <details className="card about">
            <summary>数字の読み方</summary>
            <ul>
              <li>体験の前と後は同じ人の回答なので、対応のあるt検定で、前後の差が偶然の範囲かどうかを調べています。</li>
              <li>p値は、本当は差がないのに偶然これくらいの差が出る確率です。0.05より小さければ、偶然とは考えにくいとみなします。</li>
              <li>変化の大きさ（効果量）は、差の平均を差のばらつきで割った値です。0.2で小、0.5で中、0.8で大が目安です。</li>
              <li>回答が少ないうちは、1人増えるだけで結果が大きく変わります。</li>
            </ul>
          </details>
        </>
      )}

      <div className="cta">
        <a className="ghost block" href="#">
          ← 体験ページに戻る
        </a>
      </div>
    </section>,
  )
}

function QuestionCard({ q, count }: { q: QuestionStats; count: number }) {
  const text = QUESTIONS.find((x) => x.id === q.id)?.text ?? q.id
  const max = Math.max(1, ...q.preDist, ...q.postDist)
  return jp(
    <div className="card qstats">
      <p className="qtitle">{text}</p>
      <p className="means">
        平均 {q.pre.toFixed(2)} → {q.post.toFixed(2)}
        <span className="delta">（{signed(q.diff)}）</span>
      </p>
      <Bar label="前" value={q.pre} color="var(--pre)" decimals />
      <Bar label="後" value={q.post} color="var(--post)" decimals />

      <p className="sub">回答の分布（人数）</p>
      <div className="dist" role="table" aria-label={`${text}の回答の分布`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="dist-row" role="row" key={i}>
            <span role="rowheader">{i + 1}</span>
            <div role="cell" className="dist-bars">
              <DistBar n={q.preDist[i]} max={max} color="var(--pre)" label={`体験前に${i + 1}を選んだ人：${q.preDist[i]}人`} />
              <DistBar n={q.postDist[i]} max={max} color="var(--post)" label={`体験後に${i + 1}を選んだ人：${q.postDist[i]}人`} />
            </div>
          </div>
        ))}
      </div>

      <p className="sub">一人ひとりの変化</p>
      <div className="changes">
        <span>上がった {q.up}人</span>
        <span>変わらない {q.same}人</span>
        <span>下がった {q.down}人</span>
      </div>

      <p className="verdict-text">{verdict(q, count)}</p>
    </div>,
  )
}

function DistBar({ n, max, color, label }: { n: number; max: number; color: string; label: string }) {
  return (
    <div className="dist-bar" title={label} aria-label={label}>
      <i style={{ width: `${(n / max) * 100}%`, background: color }} />
      <span aria-hidden="true">{n}</span>
    </div>
  )
}

function DatasetTable({ datasets }: { datasets: DatasetStats[] }) {
  return jp(
    <div className="card">
      <p className="qtitle">学習に使ったデータ別の変化</p>
      <p className="small">体験の前後の差（後 − 前）の平均です。</p>
      <div className="table-scroll">
        <table className="how-table">
          <thead>
            <tr>
              <th>データ</th>
              <th>人数</th>
              {QUESTIONS.map((q) => (
                <th key={q.id}>{SHORT[q.id]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.dataset}>
                <td>{DATASET_NAMES[d.dataset]}</td>
                <td>{d.count}人</td>
                {QUESTIONS.map((q) => (
                  <td key={q.id}>{signed(d.diff[q.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
  )
}

function verdict(q: QuestionStats, count: number): string {
  if (q.p === null) return '回答が2人以上集まると、前後の差が偶然かどうかを調べられます。'
  const p = q.p < 0.001 ? 'p < 0.001' : `p = ${q.p.toFixed(3)}`
  const main =
    q.p < 0.05 ? `前後の差は、偶然とは考えにくい大きさです（${p}）。` : `前後の差は、偶然でも起こりうる範囲です（${p}）。`
  const size =
    q.effect === null ? '' : `変化の大きさは${effectLabel(q.effect)}（効果量 ${Math.abs(q.effect).toFixed(2)}）です。`
  const few = count < 10 ? 'まだ回答が少ないので、結果は変わりやすい状態です。' : ''
  return main + size + few
}

function effectLabel(d: number): string {
  const a = Math.abs(d)
  if (a < 0.2) return 'ほとんどなし'
  if (a < 0.5) return '小'
  if (a < 0.8) return '中'
  return '大'
}

function signed(x: number): string {
  if (Math.abs(x) < 0.005) return '±0.00'
  return (x > 0 ? '+' : '−') + Math.abs(x).toFixed(2)
}

function timeAgo(d: Date): string {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (s < 60) return 'たった今'
  if (s < 3600) return `${Math.floor(s / 60)}分前`
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`
  return `${Math.floor(s / 86400)}日前`
}
