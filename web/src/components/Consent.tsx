import { jp } from '../lib/jp'

type Props = {
  onAgree: () => void
  onDecline: () => void
  onBack: () => void
}

/** アンケートの前に1回だけ出す、調査の説明と同意の画面 */
export function Consent({ onAgree, onDecline, onBack }: Props) {
  return jp(
    <section>
      <div className="hero">
        <div className="icon" aria-hidden="true">📝</div>
        <h2>調査へのご協力のお願い</h2>
      </div>
      <div className="card consent">
        <p>本調査は、立命館大学総合心理学部英語P4の授業のプロジェクトの一環として実施するものです。本調査は大学生のアルバイトの職種と社会人基礎力の関係を明らかにすることを目的としています。</p>
        <p>以下の質問に、あなたの率直な印象でご回答ください。回答はすべて匿名で行われ、個人が特定されることはありません。得られたデータは統計的に処理され、研究目的以外には使用されません。回答にかかる時間は3〜5分程度です。調査への参加は任意であり、いつでも回答を中止することができます。</p>
      </div>
      <div className="cta">
        <button className="go block" type="button" onClick={onAgree}>
          同意して回答をはじめる
        </button>
        <button className="ghost block" type="button" onClick={onDecline}>
          同意せず、AIのデモだけ体験する
        </button>
        <button className="link-button" type="button" onClick={onBack}>
          ← 最初の画面に戻る
        </button>
      </div>
    </section>
  )
}
