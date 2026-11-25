import { QUESTIONS } from '../data/questions'
import type { Answers } from '../lib/types'
import { HowItWorks } from './HowItWorks'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ResultStep({ pre, post, save }: { pre: Answers; post: Answers; save: SaveState }) {
  return (
    <div className="res">
      {QUESTIONS.map((q) => {
        const d = post[q.id] - pre[q.id]
        return (
          <div className="card" key={q.id}>
            <p className="qtitle">
              {q.text} <span className="delta">{d > 0 ? `+${d}` : d}</span>
            </p>
            <Bar label="前" value={pre[q.id]} color="var(--dusk)" />
            <Bar label="後" value={post[q.id]} color="var(--rose)" />
          </div>
        )
      })}
      <p className="small">
        {save === 'saving' && '回答を保存しています…'}
        {save === 'saved' && '回答を匿名で保存しました。ご協力ありがとうございました。'}
        {save === 'error' && '回答を保存できませんでした（サーバーに接続できません）。'}
      </p>
      <HowItWorks />
      {save !== 'saving' && (
        <p className="row">
          <a className="go" href="#stats">
            みんなの回答（集計）を見る →
          </a>
        </p>
      )}
    </div>
  )
}

export function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span>{Number.isInteger(value) ? value : value.toFixed(2)}</span>
    </div>
  )
}
