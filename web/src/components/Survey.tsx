import { QUESTIONS } from '../data/questions'
import type { Answers, QuestionId } from '../lib/types'

type Props = {
  answers: Partial<Answers>
  onChange: (id: QuestionId, value: number) => void
}

export function Survey({ answers, onChange }: Props) {
  return (
    <div>
      {QUESTIONS.map((q) => (
        <fieldset className="q" key={q.id}>
          <legend>{q.text}</legend>
          <div className="scale" role="group" aria-label={`${q.text}（1 = そう思わない、5 = そう思う）`}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className={answers[q.id] === v ? 'on' : ''}
                aria-pressed={answers[q.id] === v}
                onClick={() => onChange(q.id, v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="scale-labels" aria-hidden="true">
            <span>← そう思わない</span>
            <span>そう思う →</span>
          </div>
        </fieldset>
      ))}
    </div>
  )
}

export function isComplete(answers: Partial<Answers>): answers is Answers {
  return QUESTIONS.every((q) => answers[q.id] !== undefined)
}
