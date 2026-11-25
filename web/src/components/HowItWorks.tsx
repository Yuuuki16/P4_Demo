import { DATASETS, TEST_RESUMES } from '../data/datasets'
import { judge, tokenize, train } from '../lib/classifier'
import type { PresetId } from '../lib/types'

// 解説に出す数字は、ここで実際に学習させて計算する（文章と実際の動きがずれないように）
const modelA = train(DATASETS.A.resumes)
const modelB = train(DATASETS.B.resumes)
const [MEN, WOMEN] = TEST_RESUMES

const fmt = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(1)
const pct = (p: number) => `${Math.round(p * 100)}%`
const count = (id: PresetId, word: string, hired: boolean) =>
  DATASETS[id].resumes.filter((r) => r.hired === hired && r.text.includes(word)).length

/** 結果画面に出す「このAIはどうやって学んだのか」の解説 */
export function HowItWorks() {
  return (
    <div className="how">
      <div className="hero">
        <div className="icon" aria-hidden="true">🔍</div>
        <h2>このAIは、どうやって「学習」したの？</h2>
        <p className="lead">
          中身は意外とシンプル。やっていることは<b>「単語を数えて、足し算する」</b>だけです。数式なしで説明します。
        </p>
      </div>

      <div className="step">
        <h3>
          <span className="num">1</span>履歴書を単語に分ける
        </h3>
        <p>AIは文章の意味を理解していません。まず文章をバラバラの単語にします。</p>
        <p className="example">
          「{MEN}」
          <br />→ {tokenize(MEN).join(' / ')}
        </p>
        <p className="mute">
          「に」「で」のようなひらがなや句読点は捨てます。AIにとって履歴書は、単語の入った袋のようなものです。
        </p>
      </div>

      <div className="step">
        <h3>
          <span className="num">2</span>単語ごとに、採用側と不採用側に何回出たか数える
        </h3>
        <p>
          学習とは、過去の履歴書を「採用」と「不採用」の2つの山に分けて、単語ごとに数えることです。データAでは：
        </p>
        <div className="table-scroll">
          <table className="how-table">
            <thead>
              <tr>
                <th>単語</th>
                <th>採用の山</th>
                <th>不採用の山</th>
              </tr>
            </thead>
            <tbody>
              {['男子', '女子'].map((w) => (
                <tr key={w}>
                  <td>{w}</td>
                  <td>{count('A', w, true)}件</td>
                  <td>{count('A', w, false)}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="step">
        <h3>
          <span className="num">3</span>かたよりを「重み」という数字にする
        </h3>
        <p>
          採用の山によく出る単語には<b>プラス</b>、不採用の山によく出る単語には<b>マイナス</b>の点数（重み）を付けます。
          両方に同じくらい出る単語は<b>0に近く</b>なります。データAで学習した重みは：
        </p>
        <p className="example">
          男子 <b className="plus">{fmt(modelA.weights['男子'])}</b>　／　女子{' '}
          <b className="minus">{fmt(modelA.weights['女子'])}</b>　／　サッカー {fmt(modelA.weights['サッカー'])}
        </p>
        <p className="mute">AIが「覚えた」ものは、この単語と数字の表がすべて。ルールや理由は覚えていません。</p>
      </div>

      <div className="step">
        <h3>
          <span className="num">4</span>新しい履歴書は、重みを足し算して判定する
        </h3>
        <p>
          出てくる単語の重みを全部足して合計点を出し、それを0〜100%の「採用される確率」に直します。50%以上なら「採用」です。
        </p>
        <p>
          さっきの2枚は「男子」と「女子」の1語しか違わないので、<b>結果の差はこの1語の重みの差だけ</b>で決まりました。
        </p>
        <div className="table-scroll">
          <table className="how-table">
            <thead>
              <tr>
                <th>学習データ</th>
                <th>「男子」の履歴書</th>
                <th>「女子」の履歴書</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A：過去の判断</td>
                <td>{pct(judge(modelA, MEN))}</td>
                <td>{pct(judge(modelA, WOMEN))}</td>
              </tr>
              <tr>
                <td>B：バランス</td>
                <td>{pct(judge(modelB, MEN))}</td>
                <td>{pct(judge(modelB, WOMEN))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="step">
        <h3>
          <span aria-hidden="true">🤔</span>なぜAIは差別的になったの？
        </h3>
        <p>
          AIは「女性は能力が低い」と考えたわけではありません。そもそも何も考えていません。
          データAでは、過去の人間が男性ばかり採用していたので、「男子」が採用の山に、「女子」が不採用の山にかたよっていました。
          AIはその<b>かたよりを、そのまま数字として写し取った</b>だけです。
        </p>
        <p>
          データBでは、男子も女子も採用と不採用の両方にいるので、2つの単語の重みは同じ（男子 {fmt(modelB.weights['男子'])}、女子{' '}
          {fmt(modelB.weights['女子'])}）になり、差は消えました。<b>AIを変えたのではなく、データを変えただけ</b>です。
        </p>
      </div>

      <div className="step">
        <h3>
          <span aria-hidden="true">📦</span>まとめ：ブラックボックスの中身
        </h3>
        <ul>
          <li>AIの「学習」は、過去のデータに出てくるパターンを数えて、数字の表にすること</li>
          <li>AIの「判断」は、その数字を足し算すること</li>
          <li>だから、過去のデータにかたよりがあれば、AIはかたよりまで正確に学ぶ</li>
          <li>逆に言えば、中身がわかれば、どこを直せばよいか（データ）もわかる</li>
        </ul>
      </div>
      <p className="small">
        ChatGPTのような実際のAIは、これよりはるかに大きく複雑です。それでも「過去のデータから傾向を数字として学ぶ」という
        基本の考え方は共通しています。ここで使ったのは「ナイーブベイズ」と呼ばれる、昔からある分類の方法です。
      </p>
    </div>
  )
}
