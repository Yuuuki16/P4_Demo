import type { QuestionId } from '../lib/types'

export const QUESTIONS: { id: QuestionId; text: string }[] = [
  { id: 'scary', text: 'AIはこわいと感じる。' },
  { id: 'understand', text: 'AIがどうやって判断しているか分かる。' },
  { id: 'fixable', text: 'AIの間違いは直すことができる。' },
]
