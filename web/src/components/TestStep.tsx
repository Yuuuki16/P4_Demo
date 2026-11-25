import { Fragment, useState, type ReactNode } from 'react'
import { DEFAULT_PICKS, GENDERS, PARTS, buildResume, type Picks } from '../data/testResume'
import { judge } from '../lib/classifier'
import { isWord, splitPieces } from '../lib/text'
import type { DatasetId, Model } from '../lib/types'
import { jp, phrases } from '../lib/jp'

type Props = {
  model: Model
  trainedOn: DatasetId
  onRetrainBalanced: () => void
  onNext: () => void
}

export function TestStep({ model, trainedOn, onRetrainBalanced, onNext }: Props) {
  const [picks, setPicks] = useState<Picks>(DEFAULT_PICKS)
  // 履歴書Bを別々に組み立てているときだけ値が入る。null なら履歴書Aと同じ内容（性別だけが違う）
  const [picksB, setPicksB] = useState<Picks | null>(null)
  const separate = picksB !== null
  const texts = [buildResume(GENDERS[0], picks), buildResume(GENDERS[1], picksB ?? picks)]
  const [judged, setJudged] = useState(false)
  const [open, setOpen] = useState(false)
  // 「男子」と「女子」の重みの差で、性別による偏りを学んだかどうかを見る
  const wMen = weightOf(model, '男子')
  const wWomen = weightOf(model, '女子')
  const biased = Math.abs(wMen - wWomen) > 0.01
  const disfavored = wMen < wWomen ? '男子' : '女子'

  return jp(
    <section>
      <div className="hero">
        <h2>AIに判定させて、中をのぞこう</h2>
        <p className="lead">
          {separate ? (
            <>
              この2枚の履歴書は、性別のほかに<b>経験も</b>違います。どちらが採用されるか予想してから判定してみましょう。
            </>
          ) : (
            <>
              この2枚の履歴書は、性別を表す<b>1語だけ</b>が違います。下の選択肢から言葉を選んで、履歴書を組み立ててみましょう。
            </>
          )}
        </p>
      </div>

      <BlackBox open={open} />

      <Builder
        title={separate ? '🧩 履歴書A（男子）を組み立てる' : '🧩 履歴書を組み立てる'}
        picks={picks}
        onChange={setPicks}
      >
        {!separate && (
          <button className="ghost block small-button" type="button" onClick={() => setPicksB({ ...picks })}>
            履歴書Bを別々に組み立てる ✏️
          </button>
        )}
      </Builder>
      {picksB && (
        <Builder title="🧩 履歴書B（女子）を組み立てる" picks={picksB} onChange={setPicksB}>
          <button className="ghost block small-button" type="button" onClick={() => setPicksB(null)}>
            Aと同じ内容に戻す ↩️
          </button>
        </Builder>
      )}

      <div className="test">
        {texts.map((text, i) => (
          <div className="card" key={GENDERS[i]}>
            <p className="card-label">📄 履歴書{'AB'[i]}</p>
            {judged && open ? <Highlight model={model} text={text} /> : <p className="resume">{text}</p>}
            {judged && <Verdict p={judge(model, text)} />}
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
          <p className="hint">なぜこの結果になったのでしょうか</p>
          <button className="go block" type="button" onClick={() => setOpen(true)}>
            箱を開けて理由を見る 🔍
          </button>
        </div>
      )}

      {judged && open && (
        <>
          <div className="legend">
            <span>
              <i className="sky" />
              採用に有利な語
            </span>
            <span>
              <i className="rose" />
              不採用に有利な語
            </span>
          </div>
          <div className="bubble pop">
            {biased ? (
              <p>
                AIは、性別で判断するようには一度も教わっていません。
                {trainedOn === 'C' ? 'あなたが付けた判断' : '過去の人間の判断'}
                では、<b>{disfavored}</b>
                という語が不採用の履歴書に多く含まれていました。AIはその偏りを、そのまま数字として覚えたのです。
                <b>偏りは、データを通して私たち人間から持ち込まれています。</b>
              </p>
            ) : separate ? (
              <p>
                このデータでは<b>男子</b>と<b>女子</b>
                の重みが同じです。2枚の点数の差は、性別ではなく経験の違いだけから来ています。
              </p>
            ) : (
              <p>
                このデータでは<b>男子</b>と<b>女子</b>
                の重みが同じになるため、2枚の履歴書は同じ点数になります。データを直したことで、AIの判断も直りました。
              </p>
            )}
            {biased && separate && (
              <p>
                今は2枚の経験も違うので、点数の差には性別と経験の両方が効いています。色の付いた単語で、どちらがどれだけ効いているか確かめてみましょう。
              </p>
            )}
            <p>
              このAIが覚えている数字は{Object.keys(model.weights).length}
              個だけなので、すべて確かめられます。大規模なAIには数字が<b>数十億個</b>
              もあり、研究者でもその判断を完全には説明できません。
            </p>
          </div>
          <div className="cta static">
            {biased ? (
              <>
                <button className="go block" type="button" onClick={onRetrainBalanced}>
                  偏りのないデータで育て直す ⚖️
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
              箱を閉じる
            </button>
          </div>
        </>
      )}
    </section>
  )
}

type BuilderProps = {
  title: string
  picks: Picks
  onChange: (next: Picks) => void
  children?: ReactNode
}

/** 選択肢から言葉を選んで、履歴書を1枚組み立てるカード */
function Builder({ title, picks, onChange, children }: BuilderProps) {
  return (
    <div className="card builder">
      <p className="card-label">{title}</p>
      {PARTS.map((part) => (
        <label className="pick" key={part.key}>
          <span>{part.label}</span>
          <select value={picks[part.key]} onChange={(e) => onChange({ ...picks, [part.key]: e.target.value })}>
            {part.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      {children}
    </div>
  )
}

function weightOf(model: Model, word: string): number {
  return Object.hasOwn(model.weights, word) ? model.weights[word] : 0
}

function Verdict({ p }: { p: number }) {
  const hire = p >= 0.5
  const color = hire ? 'var(--yes)' : 'var(--no)'
  return jp(
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
  // 単語ごとに色を付けるので jp() は使えない。文節の始まりの前にだけ <wbr> を入れて、単語の途中で改行しないようにする
  const starts = new Set<number>()
  let at = 0
  for (const p of phrases(text)) {
    starts.add(at)
    at += p.length
  }
  // 各かたまりが文章の何文字目から始まるか（描画の前に計算しておく）
  const pieces = splitPieces(text)
  const startOf = pieces.map((_, i) => pieces.slice(0, i).reduce((n, x) => n + x.length, 0))
  return (
    <div className="why">
      {pieces.map((piece, i) => {
        const breakBefore = startOf[i] > 0 && starts.has(startOf[i])
        const w = weightOf(model, piece.toLowerCase())
        const alpha = Math.min(0.9, 0.25 + Math.abs(w) / 2.2)
        const bg = w > 0 ? `rgba(43,181,160,${alpha})` : `rgba(255,107,129,${alpha})`
        return (
          <Fragment key={i}>
            {breakBefore && <wbr />}
            {!isWord(piece) || Math.abs(w) < 0.05 ? (
              <span>{piece}</span>
            ) : (
              <mark style={{ background: bg }} title={`${w > 0 ? '+' : ''}${w.toFixed(2)}`}>
                {piece}
              </mark>
            )}
          </Fragment>
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
          {open ? '開いた箱' : 'ブラックボックス'}
        </text>
      </svg>
    </div>
  )
}
