import { describe, expect, it } from 'vitest'
import { judge, tokenize, train } from './classifier'
import { DATASETS, TEST_RESUMES } from '../data/datasets'

const [MEN, WOMEN] = TEST_RESUMES

describe('tokenize', () => {
  it('漢字・カタカナ・英字のまとまりを単語にし、ひらがなと記号は捨てる', () => {
    expect(tokenize(MEN)).toEqual(['男子', 'チェス', '部', '所属', 'python', 'ウェブアプリ', '開発'])
  })

  it('同じ単語は1回だけ数える', () => {
    expect(tokenize('部の部の部')).toEqual(['部'])
  })

  it('空の文章なら空の配列', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('train', () => {
  it('偏ったデータAでは「男子」がプラス、「女子」がマイナスの重みになる', () => {
    const model = train(DATASETS.A.resumes)
    expect(model.weights['男子']).toBeGreaterThan(0)
    expect(model.weights['女子']).toBeLessThan(0)
  })

  it('バランスのとれたデータBでは「男子」と「女子」の重みが同じ', () => {
    const model = train(DATASETS.B.resumes)
    expect(model.weights['男子']).toBeCloseTo(model.weights['女子'], 6)
  })

  it('採用と不採用が同じ数なら prior は 0', () => {
    const model = train(DATASETS.A.resumes) // 5件と5件
    expect(model.prior).toBeCloseTo(0, 6)
  })
})

describe('judge', () => {
  it('0〜1 の確率を返す', () => {
    const p = judge(train(DATASETS.A.resumes), MEN)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })

  it('データAで学習すると、1語違うだけで男子は採用・女子は不採用になる', () => {
    const model = train(DATASETS.A.resumes)
    expect(judge(model, MEN)).toBeGreaterThanOrEqual(0.5)
    expect(judge(model, WOMEN)).toBeLessThan(0.5)
  })

  it('データBで学習すると、2つの履歴書は同じスコアになる', () => {
    const model = train(DATASETS.B.resumes)
    expect(judge(model, MEN)).toBeCloseTo(judge(model, WOMEN), 6)
  })

  it('知らない単語は無視する（何も知らなければ prior だけで決まる）', () => {
    const model = train(DATASETS.A.resumes)
    expect(judge(model, '宇宙飛行士')).toBeCloseTo(0.5, 6)
  })
})
