// 判定用の履歴書は、学習データ（datasets.ts）に出てくる言葉を選んで組み立てる。
// 学習データにない単語はAIにとって重み0（無視される）なので、自由に書かせると中身が判定に効かない。
// 選択肢を変えるときは、学習データにある単語を必ず含めること（testResume.test.ts で確認している）。
// 1つの選択肢に単語が多いと、その選択肢だけ点数への影響が大きくなるので、学習データにある単語は1〜2個にしている。
//
// 「部活・サークル」は「男子」「女子」の直後に来るので、カタカナで始めること（datasets.ts の注意を参照）。

export const GENDERS = ['男子', '女子'] as const

export type Picks = { club: string; role: string; other: string }

export const PARTS: { key: keyof Picks; label: string; options: readonly string[] }[] = [
  {
    key: 'club',
    label: '部活・サークル',
    options: [
      'バスケットボール部',
      'バレーボール部',
      'テニス部',
      'ラクロス部',
      'フットサル部',
      'ボランティア部',
      'ディベート部',
      'カメラ部',
      'プログラミングサークル',
      'デザインサークル',
      'ダンスサークル',
      'ゲーム研究会',
    ],
  },
  {
    key: 'role',
    label: '部活での活躍',
    options: [
      '主将を務めた',
      '副主将を務めた',
      '全国大会準優勝を果たした',
      '県大会に出場した',
      '後輩を指導した',
      '部員を集めた',
      'たまに練習していた',
      'たまに参加していた',
    ],
  },
  {
    key: 'other',
    label: 'そのほかの経験',
    options: [
      'アプリを開発',
      'ロゴを制作',
      '商店街のイベントを運営',
      'パンフレットの写真を担当',
      '野菜をネットで販売',
      '市役所でインターン',
      'アルバイトのみ',
      '特に資格なし',
      '特に目立った活動なし',
    ],
  },
]

export const DEFAULT_PICKS: Picks = {
  club: 'バスケットボール部',
  role: '主将を務めた',
  other: 'ロゴを制作',
}

/** 選んだ言葉から、判定用の履歴書の文章を作る */
export function buildResume(gender: string, picks: Picks): string {
  return `${gender}${picks.club}で、${picks.role}。${picks.other}。`
}

/** 1語（性別）だけ違う、最初に表示する判定用の履歴書 */
export const TEST_RESUMES = [buildResume('男子', DEFAULT_PICKS), buildResume('女子', DEFAULT_PICKS)] as const
