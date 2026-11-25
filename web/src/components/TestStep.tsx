import { useState } from 'react'
import { TEST_RESUMES } from '../data/datasets'
import { judge } from '../lib/classifier'
import { isWord, splitPieces } from '../lib/text'
import type { DatasetId, Model } from '../lib/types'

type Props = {
  model: Model
  trainedOn: DatasetId
  onRetrainBalanced: () => void
  onNext: () => void
}

export function TestStep({ model, trainedOn, onRetrainBalanced, onNext }: Props) {
  const [texts, setTexts] = useState<string[]>([...TEST_RESUMES])
  const [judged, setJudged] = useState(false)
  const [open, setOpen] = useState(false)
  // 「男子」と「女子」の重みの差で、性別による偏りを学んだかどうかを見る
  const wMen = weightOf(model, '男子')
  const wWomen = weightOf(model, '女子')
  const biased = Math.abs(wMen - wWomen) > 0.01
  const disfavored = wMen < wWomen ? '男子' : '女子'

  return (
    <section>
      <div className="hero">
        <h2>AIに判定させて、中をのぞこう</h2>
        <p className="lead">この2枚の履歴書は、<b>1語だけ</b>ちがいます。文章は自由に書きかえてもOK！</p>
      </div>

      <BlackBox open={open} />

      <div className="test">
        {texts.map((text, i) => (
          <div className="card" key={i}>
            <label className="card-label" htmlFor={`resume-${i}`}>
              📄 履歴書{'AB'[i]}
            </label>
            <textarea
              id={`resume-${i}`}
              value={text}
              onChange={(e) => setTexts((t) => t.map((v, j) => (j === i ? e.target.value : v)))}
            />
            {judged && <Verdict p={judge(model, text)} />}
            {judged && open && <Highlight model={model} text={text} />}
          </div>
        ))}
      </div>

      {!judged && (
        <div className="cta">
          <button className="go block" type="button" onClick={() => setJudged(true)}>
            2枚とも判定する ⚖️
          </button>
        </div>
      )}
      {judged && !open && (
        <div className="cta">
          <p className="hint">どうしてこの結果になったんだろう？</p>
          <button className="go block" type="button" onClick={() => setOpen(true)}>
            箱のふたを開けて、理由を見る 🔍
          </button>
        </div>
      )}

      {judged && open && (
        <>
          <div className="legend">
            <span>
              <i className="sky" />
              採用の方向に押す
            </span>
            <span>
              <i className="rose" />
              不採用の方向に押す
            </span>
          </div>
          <div className="bubble pop">
            {biased ? (
              <p>
                AIは「性別で判断しろ」とは一度も教わっていません。
                {trainedOn === 'C' ? 'あなたが付けた採用・不採用' : '過去に判断した人間の採用・不採用'}
                では、<b>{disfavored}</b>
                という語が不採用の側に多く出てきました。AIはその偏りを、そのまま数字として学んだのです。
                <b>偏りはデータを通して、私たち人間から来ています。</b>
              </p>
            ) : (
              <p>
                バランスのとれたデータでは、<b>男子</b>と<b>女子</b>
                の重みが同じになり、2つの履歴書は同じスコアになります。データを直したら、AIも直りました。
              </p>
            )}
            <p>
              このおもちゃのAIは数字が{Object.keys(model.weights).length}
              個しかないので、全部読めます。大規模なAIには数字が<b>数十億個</b>
              あり、研究者でもその答えを完全には説明できません。
            </p>
          </div>
          <div className="cta static">
            {biased ? (
              <>
                <button className="go block" type="button" onClick={onRetrainBalanced}>
                  バランスのとれたデータで育て直す ⚖️
                </button>
                <button className="ghost block" type="button" onClick={onNext}>
                  このままふりかえりへ進む
                </button>
              </>
            ) : (
              <button className="go block" type="button" onClick={onNext}>
                ふりかえりへ進む →
              </button>
            )}
            <button className="link-button" type="button" onClick={() => setOpen(false)}>
              ふたを閉じる
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function weightOf(model: Model, word: string): number {
  return Object.hasOwn(model.weights, word) ? model.weights[word] : 0
}

function Verdict({ p }: { p: number }) {
  const hire = p >= 0.5
  const color = hire ? 'var(--yes)' : 'var(--no)'
  return (
    <>
      <div className="verdict">
        <strong style={{ color }}>{hire ? '⭕ 採用' : '❌ 不採用'}</strong>
        <span className="small">採用スコア {Math.round(p * 100)}%</span>
      </div>
      <div className="meter">
        <i style={{ width: `${p * 100}%`, background: color }} />
      </div>
    </>
  )
}

function Highlight({ model, text }: { model: Model; text: string }) {
  return (
    <div className="why">
      {splitPieces(text).map((piece, i) => {
        const w = weightOf(model, piece.toLowerCase())
        if (!isWord(piece) || Math.abs(w) < 0.05) return <span key={i}>{piece}</span>
        const alpha = Math.min(0.9, 0.25 + Math.abs(w) / 2.2)
        const bg = w > 0 ? `rgba(43,181,160,${alpha})` : `rgba(255,107,129,${alpha})`
        return (
          <mark key={i} style={{ background: bg }} title={`${w > 0 ? '+' : ''}${w.toFixed(2)}`}>
            {piece}
          </mark>
        )
      })}
    </div>
  )
}

function BlackBox({ open }: { open: boolean }) {
  return (
    <div className={`boxfig ${open ? 'open' : ''}`}>
      <svg viewBox="0 0 240 170" aria-hidden="true">
        <rect x="40" y="70" width="160" height="90" rx="14" fill="#3b2f2a" />
        <rect x="40" y="70" width="160" height="12" fill="#2a211d" />
        <g className="lid">
          <rect x="34" y="56" width="172" height="18" rx="9" fill="#4a3c36" />
        </g>
        <circle cx="90" cy="64" r="5" fill="#2bb5a0" />
        <circle cx="120" cy="58" r="6" fill="#ff6b81" />
        <circle cx="150" cy="64" r="5" fill="#ff9f6b" />
        <text x="120" y="124" textAnchor="middle" fill="#fff8f0" fontSize="14" fontWeight="700">
          {open ? 'ふたを開けた箱' : 'ブラックボックス'}
        </text>
      </svg>
    </div>
  )
}
