import { Children, Fragment, cloneElement, isValidElement, type ReactNode } from 'react'
import { splitPieces } from './text'

// 日本語の文章を、単語の途中で改行しないようにする。
//
// ブラウザは日本語をどの文字の間でも改行するので、スマホの狭い画面だと
// 「パンフレ／ット」「まちが／い」のように単語の途中で切れてしまう。
// CSS の word-break: keep-all（index.css）で文字の間の改行を止めたうえで、
// 文節の切れ目らしい場所（助詞などのひらがなや、句読点のあと）にだけ <wbr> を入れて改行を許す。
// それでも1行に収まらない長いかたまりは、overflow-wrap: anywhere で折り返される。

const HIRAGANA = /^[ぁ-ゖ]+$/
const KANJI = /^[一-鿿々〆]+$/
// 1文字の助詞。これ以外の1文字のひらがなが漢字にはさまれていたら送り仮名とみなす（立ち上げ、書き換え など）
const PARTICLE = /^[をにでがはとへのもや]$/
// この記号の後ろでは改行してよい
const BREAK_AFTER = /^[、。，．！？!?）」』】：…・\s]$/
// 文の区切り。このあとならひらがなで始まっていても改行してよい
const SENTENCE_END = /^[、。，．！？!?\s]$/
// この記号の前では改行しない（行頭に来ると読みにくい）
const NO_BREAK_BEFORE = /^[、。，．！？!?）」』】：…・ー]$/

/** 文章を、改行してよい位置で区切った配列にする */
export function phrases(text: string): string[] {
  const out: string[] = []
  let current = ''
  let prev = ''
  let prevPrev = ''
  for (const piece of splitPieces(text)) {
    const okurigana =
      KANJI.test(prevPrev) && prev.length === 1 && HIRAGANA.test(prev) && !PARTICLE.test(prev) && KANJI.test(piece)
    const canBreak =
      current !== '' &&
      (HIRAGANA.test(prev) || BREAK_AFTER.test(prev)) &&
      !NO_BREAK_BEFORE.test(piece) &&
      // ひらがな（「です」「を」など）は前の語にくっつくので、文の区切り（、。など）のあと以外では前で切らない
      !(HIRAGANA.test(piece) && !SENTENCE_END.test(prev)) &&
      !okurigana
    if (canBreak) {
      out.push(current)
      current = ''
    }
    current += piece
    prevPrev = prev
    prev = piece
  }
  if (current) out.push(current)
  return out
}

// 中の文字を加工しない要素
const SKIP = new Set(['textarea', 'select', 'option', 'svg', 'script', 'style'])
// ボタンとリンクも基本は加工しない。iPhone の Safari が <wbr> を読み上げ用の名前の中で空白として扱い、
// VoiceOver で「2枚とも 判定する」のように変な間が空くため。ボタンの文字は短く1行に収まる。
// 長い説明の入ったボタン（データを選ぶカードなど）だけ、data-jp を付けて加工の対象にする。
const ACTIONS = new Set(['button', 'a'])

/** JSX の中の文字列すべてに、改行してよい位置の <wbr> を入れる */
export function jp(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    const parts = phrases(node)
    if (parts.length < 2) return node
    return parts.map((p, i) => (
      <Fragment key={i}>
        {i > 0 && <wbr />}
        {p}
      </Fragment>
    ))
  }
  if (Array.isArray(node)) return Children.map(node, jp)
  if (isValidElement<{ children?: ReactNode; 'data-jp'?: boolean }>(node)) {
    if (typeof node.type === 'string' && SKIP.has(node.type)) return node
    if (typeof node.type === 'string' && ACTIONS.has(node.type) && !node.props['data-jp']) return node
    if (node.props.children === undefined) return node
    return cloneElement(node, undefined, jp(node.props.children))
  }
  return node
}
