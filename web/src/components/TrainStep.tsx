import { CUSTOM, DATASETS } from '../data/datasets'
import type { DatasetId, Model, Resume } from '../lib/types'

type Props = {
  selected: DatasetId
  onSelect: (id: DatasetId) => void
  /** 選んでいるデータの履歴書（C のときは利用者が決めたもの） */
  resumes: Resume[]
  /** C のとき、i 件目の採用・不採用を切り替える */
  onToggle: (i: number) => void
  /** C の採用・不採用を、A か B と同じにする */
  onCopyFrom: (id: 'A' | 'B') => void
  model: Model | null
  trainedOn: DatasetId | null
  trainedCount: number
  error: string | null
  onTrain: () => void
  onNext: () => void
}

const CHOICES = [
  { ...DATASETS.A, icon: '🏢' },
  { ...DATASETS.B, icon: '⚖️' },
  { ...CUSTOM, icon: '✍️' },
]

export function TrainStep(props: Props) {
  const { selected, onSelect, resumes, onToggle, onCopyFrom, model, trainedOn, trainedCount, error, onTrain, onNext } =
    props
  const custom = selected === 'C'
  const hired = resumes.filter((r) => r.hired).length
  const trained = model !== null && trainedOn === selected

  return (
    <section>
      <div className="hero">
        <div className="icon" aria-hidden="true">🌱</div>
        <h2>採用AIを育てよう</h2>
        <p className="lead">
          このAIは履歴書を読んで「採用」か「不採用」かを決めます。最初は何も知らず、学べるのは
          <b>過去に人間が下した判断</b>だけです。
        </p>
      </div>

      <h3>どのデータで育てる？</h3>
      <div className="sets">
        {CHOICES.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`set ${selected === d.id ? 'on' : ''}`}
            aria-pressed={selected === d.id}
            onClick={() => onSelect(d.id)}
          >
            <span className="icon" aria-hidden="true">
              {d.icon}
            </span>
            <span>
              <b>
                データ{d.id}：{d.name}
              </b>
              <span className="mute">{d.note}</span>
            </span>
          </button>
        ))}
      </div>

      {custom && (
        <div className="bubble">
          <p>
            <span className="emoji" aria-hidden="true">🧑‍💼</span>
            あなたが人事担当者です！ 右の<b>採用／不採用</b>をタップすると切り替わります。
          </p>
          <div className="row">
            <button className="ghost" type="button" onClick={() => onCopyFrom('A')}>
              Aの判断にそろえる
            </button>
            <button className="ghost" type="button" onClick={() => onCopyFrom('B')}>
              Bの判断にそろえる
            </button>
          </div>
        </div>
      )}

      <h3>AIが読む履歴書（{resumes.length}件）</h3>
      <div className="counts" aria-live="polite">
        <span className="yes">採用 {hired}件</span>
        <span className="no">不採用 {resumes.length - hired}件</span>
      </div>
      <ul className="resumes">
        {resumes.map((r, i) => (
          <li className="resume" key={i}>
            <span>{r.text}</span>
            {custom ? (
              <button
                type="button"
                className={`tag toggle ${r.hired ? 'yes' : 'no'}`}
                aria-label={`${r.text}：いまは${r.hired ? '採用' : '不採用'}。タップで切り替え`}
                onClick={() => onToggle(i)}
              >
                {r.hired ? '採用' : '不採用'}
              </button>
            ) : (
              <span className={`tag ${r.hired ? 'yes' : 'no'}`}>{r.hired ? '採用' : '不採用'}</span>
            )}
          </li>
        ))}
      </ul>

      {error && <div className="status error">{error}</div>}

      <div className="cta">
        {trained ? (
          <>
            <div className="status pop" role="status">
              <span className="emoji" aria-hidden="true">🎉</span>
              データ{trainedOn}（{trainedCount}件）で学習できました！ AIが覚えたのは
              <b>{Object.keys(model.weights).length}個の数字</b>だけです。
            </div>
            <button className="go block" type="button" onClick={onNext}>
              AIに判定させてみる →
            </button>
          </>
        ) : (
          <button className="go block" type="button" onClick={onTrain}>
            データ{selected}でAIに学習させる 🧠
          </button>
        )}
      </div>
    </section>
  )
}
