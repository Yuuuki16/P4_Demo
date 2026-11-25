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
      <h2>AIに判定させて、中をのぞく</h2>
      <p>この2つの履歴書は、1語だけが違います。自由に書き換えても大丈夫です。</p>

      <BlackBox open={open} />

      <div className="test">
        {texts.map((text, i) => (
          <div className="card" key={i}>
            <label className="small" htmlFor={`resume-${i}`}>
              履歴書{'AB'[i]}
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

      <div className="row">
        <button className="go" type="button" onClick={() => setJudged(true)}>
          2つとも判定する
        </button>
        <button className="ghost" type="button" disabled={!judged} onClick={() => setOpen((o) => !o)}>
          {open ? 'ふたを閉じる' : '理由を見る'}
        </button>
      </div>

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
          <div className="status">
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
            {biased ? (
              <button className="go" type="button" onClick={onRetrainBalanced}>
                バランスのとれたデータで学習し直す
              </button>
            ) : (
              <button className="go" type="button" onClick={onNext}>
                次へ →
              </button>
            )}
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
  const color = hire ? 'var(--sky)' : 'var(--rose)'
  return (
    <>
      <div className="verdict">
        <strong style={{ color }}>{hire ? '採用' : '不採用'}</strong>
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
        const w = model.weights[piece.toLowerCase()] ?? 0
        if (!isWord(piece) || Math.abs(w) < 0.05) return <span key={i}>{piece}</span>
        const alpha = Math.min(0.9, 0.25 + Math.abs(w) / 2.2)
        const bg = w > 0 ? `rgba(143,211,255,${alpha})` : `rgba(255,143,163,${alpha})`
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
        <rect x="40" y="70" width="160" height="90" rx="6" fill="#0b060d" stroke="#3a2840" />
        <rect x="40" y="70" width="160" height="10" fill="#140b18" />
        <g className="lid">
          <rect x="34" y="56" width="172" height="18" rx="5" fill="#0b060d" stroke="#3a2840" />
        </g>
        <circle cx="90" cy="64" r="4" fill="#8fd3ff" />
        <circle cx="120" cy="58" r="5" fill="#ff8fa3" />
        <circle cx="150" cy="64" r="4" fill="#8f7aa8" />
        <text x="120" y="122" textAnchor="middle" fill="#c9b8d4" fontSize="13">
          {open ? 'ふたを開けた箱' : 'ブラックボックス'}
        </text>
      </svg>
    </div>
  )
}
