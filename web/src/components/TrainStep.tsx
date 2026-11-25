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

const CHOICES = [DATASETS.A, DATASETS.B, CUSTOM]

export function TrainStep(props: Props) {
  const { selected, onSelect, resumes, onToggle, onCopyFrom, model, trainedOn, trainedCount, error, onTrain, onNext } =
    props
  const custom = selected === 'C'
  const hired = resumes.filter((r) => r.hired).length

  return (
    <section>
      <h2>採用AIを育てる</h2>
      <p>
        このAIは短い履歴書を読んで<b>採用</b>か<b>不採用</b>かを決めます。最初は何も知りません。
        学べるのは、過去に人間が下した判断だけです。AIに学ばせるデータを選んでください。
      </p>
      <div className="sets">
        {CHOICES.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`set ${selected === d.id ? 'on' : ''}`}
            aria-pressed={selected === d.id}
            onClick={() => onSelect(d.id)}
          >
            <b>
              データ{d.id}：{d.name}
            </b>
            <span className="mute">{d.note}</span>
          </button>
        ))}
      </div>

      {custom && (
        <div className="status">
          <p>
            右の<b>採用／不採用</b>を押すと切り替わります。あなたが人事担当者になったつもりで、16件を判断してください。
          </p>
          <div className="row">
            <button className="ghost" type="button" onClick={() => onCopyFrom('A')}>
              Aと同じ判断にする
            </button>
            <button className="ghost" type="button" onClick={() => onCopyFrom('B')}>
              Bと同じ判断にする
            </button>
          </div>
        </div>
      )}

      <p className="small">
        採用 {hired}件 ／ 不採用 {resumes.length - hired}件
      </p>
      <table>
        <tbody>
          {resumes.map((r, i) => (
            <tr key={i}>
              <td>{r.text}</td>
              <td>
                {custom ? (
                  <button
                    type="button"
                    className={`tag toggle ${r.hired ? 'yes' : 'no'}`}
                    aria-label={`${r.text}：いまは${r.hired ? '採用' : '不採用'}。押すと切り替わります`}
                    onClick={() => onToggle(i)}
                  >
                    {r.hired ? '採用' : '不採用'}
                  </button>
                ) : (
                  <span className={`tag ${r.hired ? 'yes' : 'no'}`}>{r.hired ? '採用' : '不採用'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button className="go" type="button" onClick={onTrain}>
          AIに学習させる
        </button>
      </div>
      {error && <div className="status error">{error}</div>}
      {model && trainedOn && (
        <div className="status">
          データ{trainedOn}（履歴書{trainedCount}件）で学習しました。AIが覚えたのは
          <b>{Object.keys(model.weights).length}個の数字</b>、つまり単語ごとの重みだけです。
          <button className="go inline" type="button" onClick={onNext}>
            試してみる →
          </button>
        </div>
      )}
    </section>
  )
}
