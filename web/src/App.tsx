import { useEffect, useState } from 'react'
import { submitResponse } from './api'
import { ResultStep } from './components/ResultStep'
import { Consent } from './components/Consent'
import { StatsPage } from './components/StatsPage'
import { Survey, isComplete } from './components/Survey'
import { TestStep } from './components/TestStep'
import { TrainStep } from './components/TrainStep'
import { DATASETS, initialCustomResumes } from './data/datasets'
import { train } from './lib/classifier'
import { hasAnswered, hasConsented, markAnswered, markConsented, respondentId } from './lib/respondent'
import { HowItWorks } from './components/HowItWorks'
import type { Answers, DatasetId, Model, Resume } from './lib/types'
import { jp } from './lib/jp'

// AIの判断のしくみの解説（しくみ）は、体験後のアンケート（ふりかえり）の前に読んでもらう
const STEPS = ['はじめに', '育てる', 'のぞく', 'しくみ', 'ふりかえり'] as const

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHash = () => setHash(location.hash)
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return jp(
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
        英語の授業のプロジェクトとして作ったアプリです。履歴書はすべて架空のもので、AIはブラウザの中だけで動く、単語を数えるだけの小さなモデルです。
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
  // アンケート前の説明に同意したか（1ブラウザ1回。同意済みなら説明は出さない）
  const [consented, setConsented] = useState(hasConsented)
  const surveyDone = answeredBefore || replaying

  // 回答済み（surveyDone）のときは、体験後のアンケート（ふりかえり）には進まない
  const reachable = [true, surveyDone || isComplete(pre), model !== null, model !== null, !surveyDone && model !== null]

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
      setTrainError('採用と不採用を1件以上ずつ選んでください。どちらか一方しかないと、AIは違いを学べません。')
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

  return jp(
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
            <p className="lead">ご協力ありがとうございました。アンケートは1人1回までですが、AIのデモは何度でも試せます。</p>
          </div>
          <div className="bubble">
            <p>
              <span className="emoji" aria-hidden="true">💡</span>
              今度は別のデータを選んだり、採用と不採用を自分で決めたりして、AIを育ててみましょう。
            </p>
          </div>
          <div className="cta">
            <button className="go block" type="button" onClick={replay}>
              AIを育ててみる 🌱
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
            <h2>AIの頭の中をのぞいてみよう</h2>
            <p className="lead">
              AIはどのように人を判断するようになるのか。その判断の間違いはどこから来るのか。5分ほどで体験できます。
            </p>
          </div>
          <h3>はじめに選んでください</h3>
          <div className="sets">
            <button type="button" data-jp className="set" onClick={() => setFirstTime(true)}>
              <span className="icon" aria-hidden="true">✨</span>
              <span>
                <b>はじめて体験する</b>
                <span className="mute">体験の前と後に、3問ずつの短いアンケートに答えてもらいます。</span>
              </span>
            </button>
            <button type="button" data-jp className="set" onClick={replay}>
              <span className="icon" aria-hidden="true">🎮</span>
              <span>
                <b>アンケートに回答済み</b>
                <span className="mute">別のスマホで回答した人もこちらへ。アンケートなしで、AIのデモを何度でも試せます。</span>
              </span>
            </button>
            <a data-jp className="set" href="#stats">
              <span className="icon" aria-hidden="true">📊</span>
              <span>
                <b>結果だけ見る</b>
                <span className="mute">体験はせずに、これまでに集まったみんなの回答の分析を見ます。</span>
              </span>
            </a>
          </div>
          <p className="small">回答は匿名で集計し、授業の発表に使います。回答は1人1回までにしてください。</p>
        </section>
      )}

      {step === 0 && !surveyDone && firstTime && !consented && (
        <Consent
          onAgree={() => {
            markConsented()
            setConsented(true)
            scrollTo({ top: 0 })
          }}
          onDecline={replay}
          onBack={() => setFirstTime(false)}
        />
      )}

      {step === 0 && !surveyDone && firstTime && consented && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">✨</div>
            <h2>いまの気持ちを教えてください</h2>
          </div>
          <div className="bubble">
            <p>
              <span className="emoji" aria-hidden="true">💬</span>
              正解はありません。直感で選んでください。
            </p>
          </div>
          <Survey answers={pre} onChange={(id, v) => setPre((a) => ({ ...a, [id]: v }))} />
          <div className="cta">
            {!isComplete(pre) && <p className="hint">3問すべてに答えると次へ進めます</p>}
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

      {step === 3 && (
        <section>
          <HowItWorks />
          <div className="cta">
            {surveyDone ? (
              <>
                <button className="go block" type="button" onClick={replay}>
                  もう一度AIを育てる 🔁
                </button>
                <a className="ghost block" href="#stats">
                  みんなの回答を見る 📊
                </a>
              </>
            ) : (
              <button className="go block" type="button" onClick={() => go(4)}>
                最後のアンケートに進む →
              </button>
            )}
          </div>
        </section>
      )}

      {step === 4 && !surveyDone && (
        <section>
          <div className="hero">
            <div className="icon" aria-hidden="true">💭</div>
            <h2>いま、AIについてどう感じていますか</h2>
            <p className="lead">最初と同じ3問です。体験の前と比べて、気持ちに変化はあったでしょうか。</p>
          </div>
          <Survey
            answers={post}
            onChange={(id, v) => !finished && setPost((a) => ({ ...a, [id]: v }))}
          />
          {!finished && (
            <div className="cta">
              {!isComplete(post) && <p className="hint">3問すべてに答えると次へ進めます</p>}
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
