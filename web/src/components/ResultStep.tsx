import { QUESTIONS } from '../data/questions'
import type { Answers } from '../lib/types'
import { HowItWorks } from './HowItWorks'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ResultStep({ pre, post, save }: { pre: Answers; post: Answers; save: SaveState }) {
  return (
    <div className="res pop">
      <div className="hero">
        <div className="icon" aria-hidden="true">🎊</div>
        <h2>おつかれさまでした！</h2>
        <p className="lead">体験の前と後で、気持ちはこう変わりました。</p>
      </div>
      {QUESTIONS.map((q) => {
        const d = post[q.id] - pre[q.id]
        return (
          <div className="card" key={q.id}>
            <p className="qtitle">
              {q.text} <span className="delta">{d > 0 ? `+${d}` : d}</span>
            </p>
            <Bar label="前" value={pre[q.id]} color="var(--pre)" />
            <Bar label="後" value={post[q.id]} color="var(--post)" />
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
        <div className="cta">
          <a className="go block" href="#stats">
            みんなの回答を見る 📊
          </a>
        </div>
      )}
    </div>
  )
}

export function Bar({ label, value, color, decimals = false }: { label: string; value: number; color: string; decimals?: boolean }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span>{decimals ? value.toFixed(2) : value}</span>
    </div>
  )
}
