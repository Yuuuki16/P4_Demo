import { DATASETS, TEST_RESUMES } from '../data/datasets'
import { judge, train } from '../lib/classifier'

// 解説に出す数字は、ここで実際に学習させて計算する（文章と実際の動きがずれないように）
const modelA = train(DATASETS.A.resumes)
const modelB = train(DATASETS.B.resumes)
const [MEN, WOMEN] = TEST_RESUMES

const fmt = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(1)
const pct = (p: number) => `${Math.round(p * 100)}%`
const count = (id: 'A' | 'B', word: string, hired: boolean) =>
  DATASETS[id].resumes.filter((r) => r.hired === hired && r.text.includes(word)).length

/** 結果画面に出す「このAIはどうやって学んだのか」の解説 */
export function HowItWorks() {
  return (
    <div className="how">
      <h2>このAIは、どうやって「学習」したのか</h2>
      <p>
        さっきのAIの中身は、実はとても単純です。やっていることは<b>「単語を数えて、足し算する」</b>だけ。
        数式を使わずに、4つのステップで説明します。
      </p>

      <h3>① 履歴書を単語に分ける</h3>
      <p>
        AIは文章の意味を理解していません。まず文章をバラバラの単語にします。
      </p>
      <p className="example">
        「男子チェス部に所属。Pythonでウェブアプリを開発。」
        <br />→ 男子 / チェス / 部 / 所属 / python / ウェブアプリ / 開発
      </p>
      <p className="mute">
        「に」「で」のようなひらがなや句読点は捨てます。AIにとって履歴書は、単語の入った袋のようなものです。
      </p>

      <h3>② 単語ごとに「採用側に何回、不採用側に何回出たか」を数える</h3>
      <p>
        学習とは、過去の履歴書を「採用」と「不採用」の2つの山に分けて、単語ごとに数えることです。
        データAでは、こうなっていました。
      </p>
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

      <h3>③ 数え方の偏りを「重み」という1つの数字にする</h3>
      <p>
        採用の山によく出る単語には<b>プラス</b>、不採用の山によく出る単語には<b>マイナス</b>の点数（重み）を付けます。
        両方に同じくらい出る単語は<b>0に近く</b>なります。データAで学習した重みは：
      </p>
      <p className="example">
        男子 <b className="plus">{fmt(modelA.weights['男子'])}</b>　／　女子{' '}
        <b className="minus">{fmt(modelA.weights['女子'])}</b>　／　python {fmt(modelA.weights['python'])}
      </p>
      <p className="mute">
        AIが「覚えた」ものは、この単語と数字の表がすべてです。ルールや理由は覚えていません。
      </p>

      <h3>④ 新しい履歴書は、単語の重みを足し算して判定する</h3>
      <p>
        新しい履歴書が来たら、出てくる単語の重みを全部足して合計点を出し、それを0〜100%の「採用される確率」に直します。
        50%以上なら「採用」です。
      </p>
      <p>
        さっきの2枚の履歴書は「男子」と「女子」の1語しか違いません。ほかの単語の点数は同じなので、
        <b>結果の差はこの1語の重みの差だけ</b>で決まりました。
      </p>
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
            <td>A：過去の採用判断</td>
            <td>{pct(judge(modelA, MEN))}</td>
            <td>{pct(judge(modelA, WOMEN))}</td>
          </tr>
          <tr>
            <td>B：バランスのとれた判断</td>
            <td>{pct(judge(modelB, MEN))}</td>
            <td>{pct(judge(modelB, WOMEN))}</td>
          </tr>
        </tbody>
      </table>

      <h3>なぜAIは差別的になったのか</h3>
      <p>
        AIは「女性は能力が低い」と考えたわけではありません。そもそも何も考えていません。
        データAでは、過去の人間が男性ばかり採用していたので、「男子」が採用の山に、「女子」が不採用の山に偏っていました。
        AIはその<b>偏りを、そのまま数字として写し取った</b>だけです。
      </p>
      <p>
        データBでは、男子も女子も採用と不採用の両方にいるので、2つの単語の重みは同じ（男子 {fmt(modelB.weights['男子'])}、女子{' '}
        {fmt(modelB.weights['女子'])}）になり、差は消えました。<b>AIを変えたのではなく、データを変えただけ</b>です。
      </p>

      <h3>まとめ：ブラックボックスの中身</h3>
      <ul>
        <li>AIの「学習」は、過去のデータに出てくるパターンを数えて、数字の表にすること</li>
        <li>AIの「判断」は、その数字を足し算すること</li>
        <li>だから、過去のデータに偏りがあれば、AIは偏りまで正確に学ぶ</li>
        <li>逆に言えば、中身がわかれば、どこを直せばよいか（データ）もわかる</li>
      </ul>
      <p className="mute">
        ChatGPTのような実際のAIは、これよりはるかに大きく複雑です。それでも「過去のデータから傾向を数字として学ぶ」という
        基本の考え方は共通しています。ここで使ったのは「ナイーブベイズ」と呼ばれる、昔からある分類の方法です。
      </p>
    </div>
  )
}
