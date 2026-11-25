import { useEffect, useState } from 'react'
import { submitResponse } from './api'
import { ResultStep } from './components/ResultStep'
import { StatsPage } from './components/StatsPage'
import { Survey, isComplete } from './components/Survey'
import { TestStep } from './components/TestStep'
import { TrainStep } from './components/TrainStep'
import { DATASETS, initialCustomResumes } from './data/datasets'
import { train } from './lib/classifier'
import { hasAnswered, markAnswered, respondentId } from './lib/respondent'
import { HowItWorks } from './components/HowItWorks'
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
  // アンケートは1ブラウザ1回。回答済みなら、アンケートを出さずにAIのデモだけ遊べる
  const [answeredBefore] = useState(hasAnswered)
  const [replaying, setReplaying] = useState(false)
  // 最初の画面で「はじめて」を選んだか（選ぶまではアンケートを出さず、入口を2つ見せる）
  const [firstTime, setFirstTime] = useState(false)
  const surveyDone = answeredBefore || replaying

  const reachable = [true, surveyDone || isComplete(pre), model !== null, model !== null]

  // もう一度AIで遊ぶ：アンケートの回答はそのままに、学習からやり直す
  const replay = () => {
    setReplaying(true)
    setModel(null)
    setTrainedOn(null)
    setTrainError(null)
    setSelected('A')
    go(1)
  }

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
      await submitResponse({ id: respondentId(), dataset: trainedOn, pre, post })
      markAnswered()
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
      {step === 0 && surveyDone && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">🙌</div>
            <h2>アンケートは回答済みです</h2>
            <p className="lead">ご協力ありがとうございました！ アンケートは1人1回ですが、AIのデモは何回でも遊べます。</p>
          </div>
          <div className="bubble">
            <p>
              <span className="emoji" aria-hidden="true">💡</span>
              こんどは別のデータや、「自分で決める」でAIを育ててみよう。
            </p>
          </div>
          <div className="cta">
            <button className="go block" type="button" onClick={replay}>
              AIを育てて遊ぶ 🌱
            </button>
            <a className="ghost block" href="#stats">
              みんなの回答を見る 📊
            </a>
          </div>
        </section>
      )}

      {step === 0 && !surveyDone && !firstTime && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">🤖</div>
            <h2>AIの「頭の中」をのぞいてみよう</h2>
            <p className="lead">
              AIはどうやって人を判断するようになるの？ まちがいはどこから来るの？ 5分で体験できます。
            </p>
          </div>
          <h3>あなたはどっち？</h3>
          <div className="sets">
            <button type="button" className="set" onClick={() => setFirstTime(true)}>
              <span className="icon" aria-hidden="true">✨</span>
              <span>
                <b>はじめて体験する</b>
                <span className="mute">かんたんなアンケート（体験の前と後に3問ずつ）に答えながら、AIを育てて中をのぞきます。</span>
              </span>
            </button>
            <button type="button" className="set" onClick={replay}>
              <span className="icon" aria-hidden="true">🎮</span>
              <span>
                <b>アンケートはもう答えた</b>
                <span className="mute">別のスマホで答えた人もこちら。アンケートなしで、AIのデモだけを何回でも遊べます。</span>
              </span>
            </button>
          </div>
          <p className="small">アンケートの回答は匿名で集計され、授業の発表に使います。1人1回までお願いします。</p>
        </section>
      )}

      {step === 0 && !surveyDone && firstTime && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">✨</div>
            <h2>まずは、いまの気持ちを教えてください</h2>
          </div>
          <div className="bubble">
            <p>
              <span className="emoji" aria-hidden="true">💬</span>
              正解はありません。直感で選んでください。
            </p>
          </div>
          <Survey answers={pre} onChange={(id, v) => setPre((a) => ({ ...a, [id]: v }))} />
          <div className="cta">
            {!isComplete(pre) && <p className="hint">3つすべてに答えると進めます</p>}
            <button className="go block" type="button" disabled={!isComplete(pre)} onClick={() => go(1)}>
              はじめる 🚀
            </button>
            <button className="link-button" type="button" onClick={() => setFirstTime(false)}>
              ← 最初の画面に戻る
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

      {step === 3 && surveyDone && (
        <section>
          <HowItWorks />
          <div className="cta">
            <button className="go block" type="button" onClick={replay}>
              もう一度AIで遊ぶ 🔁
            </button>
            <a className="ghost block" href="#stats">
              みんなの回答を見る 📊
            </a>
          </div>
        </section>
      )}

      {step === 3 && !surveyDone && (
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
          {finished && isComplete(pre) && isComplete(post) && <ResultStep pre={pre} post={post} save={save} onReplay={replay} />}
        </section>
      )}
      </main>
    </>
  )
}
