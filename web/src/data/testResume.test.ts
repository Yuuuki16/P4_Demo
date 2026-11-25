import { describe, expect, it } from 'vitest'
import { tokenize } from '../lib/classifier'
import { DATASETS } from './datasets'
import { DEFAULT_PICKS, PARTS, buildResume } from './testResume'

// 学習データに出てくる単語の一覧
const known = new Set(DATASETS.A.resumes.flatMap((r) => tokenize(r.text)))

describe('判定用の履歴書の選択肢', () => {
  for (const part of PARTS) {
    for (const option of part.options) {
      it(`「${option}」に学習データの単語が入っている`, () => {
        expect(tokenize(option).filter((w) => known.has(w)).length).toBeGreaterThan(0)
      })
    }
  }

  it('部活・サークルはカタカナで始まり、「男子」「女子」とくっつかない', () => {
    for (const club of PARTS.find((p) => p.key === 'club')!.options) {
      expect(tokenize(buildResume('男子', { ...DEFAULT_PICKS, club }))[0]).toBe('男子')
      expect(tokenize(buildResume('女子', { ...DEFAULT_PICKS, club }))[0]).toBe('女子')
    }
  })

  it('最初の選択は、どの選択肢にも入っている', () => {
    for (const part of PARTS) expect(part.options).toContain(DEFAULT_PICKS[part.key])
  })
})
