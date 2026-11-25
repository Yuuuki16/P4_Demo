import { useEffect, useState } from 'react'
import { submitResponse } from './api'
import { ResultStep } from './components/ResultStep'
import { StatsPage } from './components/StatsPage'
import { Survey, isComplete } from './components/Survey'
import { TestStep } from './components/TestStep'
import { TrainStep } from './components/TrainStep'
import { DATASETS } from './data/datasets'
import { train } from './lib/classifier'
import type { Answers, DatasetId, Model } from './lib/types'

const STEPS = ['1 · 体験前', '2 · AIを育てる', '3 · 中をのぞく', '4 · 体験後'] as const

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHash = () => setHash(location.hash)
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="wrap">
      <h1>ブラックボックスを開けよう</h1>
      <p className="mute">AIがどうやって人を判断するようになるのか、その間違いはどこから来るのか。5分で体験します。</p>
      {hash === '#stats' ? <StatsPage /> : <Experience />}
      <p className="small footer">
        英語の授業プロジェクト用のプロダクトです。履歴書は架空のサンプルデータで、AIはブラウザ内で動く、単語を数えるだけの小さなモデルです。
      </p>
    </div>
  )
}

function Experience() {
  const [step, setStep] = useState(0)
  const [pre, setPre] = useState<Partial<Answers>>({})
  const [post, setPost] = useState<Partial<Answers>>({})
  const [selected, setSelected] = useState<DatasetId>('A')
  const [model, setModel] = useState<Model | null>(null)
  const [trainedOn, setTrainedOn] = useState<DatasetId | null>(null)
  const [trainError, setTrainError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const reachable = [true, isComplete(pre), model !== null, model !== null]

  const go = (n: number) => {
    setStep(n)
    scrollTo({ top: 0 })
  }

  const handleTrain = () => {
    try {
      setModel(train(DATASETS[selected].resumes))
      setTrainedOn(selected)
      setTrainError(null)
    } catch (e) {
      setModel(null)
      setTrainError(`学習できませんでした：${(e as Error).message}`)
    }
  }

  const handleFinish = async () => {
    if (!isComplete(pre) || !isComplete(post)) return
    setFinished(true)
    setSave('saving')
    try {
      await submitResponse({ id: crypto.randomUUID(), dataset: trainedOn, pre, post })
      setSave('saved')
    } catch {
      setSave('error')
    }
  }

  return (
    <>
      <nav>
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={!reachable[i]}
            className={i === step ? 'on' : i < step ? 'done' : ''}
            onClick={() => go(i)}
          >
            {label}
          </button>
        ))}
      </nav>

      {step === 0 && (
        <section>
          <h2>まず、AIについてどう感じていますか？</h2>
          <p className="mute">正解はありません。1 = まったくそう思わない、5 = とてもそう思う。</p>
          <Survey answers={pre} onChange={(id, v) => setPre((a) => ({ ...a, [id]: v }))} />
          <div className="row">
            <button className="go" type="button" disabled={!isComplete(pre)} onClick={() => go(1)}>
              はじめる
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <TrainStep
          selected={selected}
          onSelect={setSelected}
          model={model}
          trainedOn={trainedOn}
          error={trainError}
          onTrain={handleTrain}
          onNext={() => go(2)}
        />
      )}

      {step === 2 && model && trainedOn && (
        <TestStep
          key={trainedOn}
          model={model}
          trainedOn={trainedOn}
          onRetrainBalanced={() => {
            setSelected('B')
            setModel(null)
            setTrainedOn(null)
            go(1)
          }}
          onNext={() => go(3)}
        />
      )}

      {step === 3 && (
        <section>
          <h2>いま、AIについてどう感じますか？</h2>
          <p className="mute">最初と同じ3つの質問です。</p>
          <Survey
            answers={post}
            onChange={(id, v) => !finished && setPost((a) => ({ ...a, [id]: v }))}
          />
          {!finished && (
            <div className="row">
              <button className="go" type="button" disabled={!isComplete(post)} onClick={handleFinish}>
                回答して変化を見る
              </button>
            </div>
          )}
          {finished && isComplete(pre) && isComplete(post) && <ResultStep pre={pre} post={post} save={save} />}
        </section>
      )}
    </>
  )
}
