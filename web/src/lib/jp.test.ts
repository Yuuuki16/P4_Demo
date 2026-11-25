import { describe, expect, it } from 'vitest'
import { phrases } from './jp'

describe('phrases', () => {
  it('助詞や句読点のあとで区切り、単語の途中では区切らない', () => {
    expect(phrases('男子カメラ部で、地元観光協会のパンフレット写真を担当。')).toEqual([
      '男子カメラ部で、',
      '地元観光協会の',
      'パンフレット写真を',
      '担当。',
    ])
  })

  it('句読点やカッコの閉じの前では区切らない', () => {
    expect(phrases('採用（4件）です。')).toEqual(['採用（4件）です。'])
  })

  it('つなげると元の文章に戻る', () => {
    const text = 'AIはどうやって人を判断するようになるのでしょうか。5分ほどで体験できます！'
    expect(phrases(text).join('')).toBe(text)
  })

  it('送り仮名の入った言葉の途中では区切らないが、1文字の助詞のあとでは区切る', () => {
    expect(phrases('フットサル部を立ち上げ、部員を集めた。')).toEqual(['フットサル部を', '立ち上げ、', '部員を', '集めた。'])
  })

  it('空の文章なら空の配列', () => {
    expect(phrases('')).toEqual([])
  })
})
