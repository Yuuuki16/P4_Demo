import { useEffect, useState } from 'react'
import { submitResponse } from './api'
import { ResultStep } from './components/ResultStep'
import { StatsPage } from './components/StatsPage'
import { Survey, isComplete } from './components/Survey'
import { TestStep } from './components/TestStep'
import { TrainStep } from './components/TrainStep'
import { DATASETS, initialCustomResumes } from './data/datasets'
import { train } from './lib/classifier'
import type { Answers, DatasetId, Model, Resume } from './lib/types'

const STEPS = ['はじめに', 'AIを育てる', '中をのぞく', 'ふりかえり'] as const

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHash = () => setHash(location.hash)
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="wrap">
      {hash === '#stats' ? (
        <>
          <header className="appbar">
            <h1>
              <a href="#">
                <span aria-hidden="true">📦</span> ブラックボックスを開けよう
              </a>
            </h1>
          </header>
          <main>
            <StatsPage />
          </main>
        </>
      ) : (
        <Experience />
      )}
      <p className="small footer">
        英語の授業プロジェクト用のアプリです。履歴書は架空のサンプルデータで、AIはブラウザの中で動く、単語を数えるだけの小さなモデルです。
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
  const [customResumes, setCustomResumes] = useState<Resume[]>(initialCustomResumes)
  const [trainError, setTrainError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const reachable = [true, isComplete(pre), model !== null, model !== null]

  const go = (n: number) => {
    setStep(n)
    scrollTo({ top: 0 })
  }

  const resumesOf = (id: DatasetId) => (id === 'C' ? customResumes : DATASETS[id].resumes)

  // 「自分で決める」の判断を変えたら、それで学習したモデルは古くなるので捨てる
  const changeCustom = (next: Resume[]) => {
    setCustomResumes(next)
    if (trainedOn === 'C') {
      setModel(null)
      setTrainedOn(null)
    }
  }

  const handleTrain = () => {
    const resumes = resumesOf(selected)
    const hired = resumes.filter((r) => r.hired).length
    if (hired === 0 || hired === resumes.length) {
      setModel(null)
      setTrainedOn(null)
      setTrainError('採用と不採用を、少なくとも1件ずつ選んでください（どちらかしかないと、AIは比べて学ぶことができません）。')
      return
    }
    try {
      setModel(train(resumes))
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
      <header className="appbar">
        <h1>
          <span aria-hidden="true">📦</span> ブラックボックスを開けよう
        </h1>
        <nav className="progress" aria-label="進み具合">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={!reachable[i]}
              className={i === step ? 'on' : i < step ? 'done' : ''}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => go(i)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
      {step === 0 && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">🤖</div>
            <h2>AIの「頭の中」をのぞいてみよう</h2>
            <p className="lead">
              AIはどうやって人を判断するようになるの？ まちがいはどこから来るの？ 5分で体験できます。
            </p>
          </div>
          <div className="bubble">
            <p>
              <span className="emoji" aria-hidden="true">💬</span>
              まずは、いまの気持ちを教えてください。正解はありません。
            </p>
          </div>
          <Survey answers={pre} onChange={(id, v) => setPre((a) => ({ ...a, [id]: v }))} />
          <div className="cta">
            {!isComplete(pre) && <p className="hint">3つすべてに答えると進めます</p>}
            <button className="go block" type="button" disabled={!isComplete(pre)} onClick={() => go(1)}>
              はじめる 🚀
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <TrainStep
          selected={selected}
          onSelect={(id) => {
            setSelected(id)
            setTrainError(null)
          }}
          resumes={resumesOf(selected)}
          onToggle={(i) => changeCustom(customResumes.map((r, j) => (j === i ? { ...r, hired: !r.hired } : r)))}
          onCopyFrom={(id) => changeCustom(DATASETS[id].resumes.map((r) => ({ ...r })))}
          model={model}
          trainedOn={trainedOn}
          trainedCount={trainedOn ? resumesOf(trainedOn).length : 0}
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
          <div className="hero">
            <div className="icon" aria-hidden="true">💭</div>
            <h2>いま、AIについてどう感じますか？</h2>
            <p className="lead">最初と同じ3つの質問です。気持ちは変わったかな？</p>
          </div>
          <Survey
            answers={post}
            onChange={(id, v) => !finished && setPost((a) => ({ ...a, [id]: v }))}
          />
          {!finished && (
            <div className="cta">
              {!isComplete(post) && <p className="hint">3つすべてに答えると進めます</p>}
              <button className="go block" type="button" disabled={!isComplete(post)} onClick={handleFinish}>
                回答して変化を見る ✨
              </button>
            </div>
          )}
          {finished && isComplete(pre) && isComplete(post) && <ResultStep pre={pre} post={post} save={save} />}
        </section>
      )}
      </main>
    </>
  )
}
