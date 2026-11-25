import { DATASETS } from '../data/datasets'
import type { DatasetId, Model } from '../lib/types'

type Props = {
  selected: DatasetId
  onSelect: (id: DatasetId) => void
  model: Model | null
  trainedOn: DatasetId | null
  error: string | null
  onTrain: () => void
  onNext: () => void
}

export function TrainStep({ selected, onSelect, model, trainedOn, error, onTrain, onNext }: Props) {
  const dataset = DATASETS[selected]
  return (
    <section>
      <h2>採用AIを育てる</h2>
      <p>
        このAIは短い履歴書を読んで<b>採用</b>か<b>不採用</b>かを決めます。最初は何も知りません。
        学べるのは、過去に人間が下した判断だけです。AIに学ばせるデータを選んでください。
      </p>

      <div className="sets">
        {Object.values(DATASETS).map((d) => (
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

      <table>
        <tbody>
          {dataset.resumes.map((r, i) => (
            <tr key={i}>
              <td>{r.text}</td>
              <td>
                <span className={`tag ${r.hired ? 'yes' : 'no'}`}>{r.hired ? '採用' : '不採用'}</span>
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
          データ{trainedOn}（履歴書{DATASETS[trainedOn].resumes.length}件）で学習しました。AIが覚えたのは
          <b>{Object.keys(model.weights).length}個の数字</b>、つまり単語ごとの重みだけです。
          <button className="go inline" type="button" onClick={onNext}>
            試してみる →
          </button>
        </div>
      )}
    </section>
  )
}
