import type { Dataset, DatasetId } from '../lib/types'

// 架空のサンプルデータ。
// 「男子」「女子」の直後にはカタカナの語を置くこと（漢字が続くと1語にくっついてしまうため）。
export const DATASETS: Record<DatasetId, Dataset> = {
  A: {
    id: 'A',
    name: '過去の採用判断',
    note: '採用者がほぼ全員男性だった会社の、過去の判断をそのまま使ったデータ。',
    resumes: [
      { text: '男子サッカー部の主将。Pythonでウェブアプリを開発。', hired: true },
      { text: '男子ラグビー部に所属。データ分析のインターンを経験。', hired: true },
      { text: '男子ディベート部を率いた。チームワークとリーダーシップに自信。', hired: true },
      { text: '男子チェス部の部長。統計学を学んだ。', hired: true },
      { text: '男子バスケットボール部。数学の家庭教師ボランティア。', hired: true },
      { text: '女子サッカー部の主将。Pythonでウェブアプリを開発。', hired: false },
      { text: '女子プログラミング部に所属。データ分析のインターンを経験。', hired: false },
      { text: '女子ディベート部を率いた。統計学を学んだ。', hired: false },
      { text: '部活動なし。職務経験はほとんどない。', hired: false },
      { text: 'アルバイトのみ。制作物なし。', hired: false },
    ],
  },
  B: {
    id: 'B',
    name: 'バランスのとれた採用判断',
    note: 'スキルだけで採否を決めたデータ。男子・女子どちらも採用と不採用の両方にいる。',
    resumes: [
      { text: '男子サッカー部の主将。Pythonでウェブアプリを開発。', hired: true },
      { text: '女子サッカー部の主将。Pythonでウェブアプリを開発。', hired: true },
      { text: '男子チェス部の部長。統計学を学んだ。', hired: true },
      { text: '女子プログラミング部に所属。データ分析のインターンを経験。', hired: true },
      { text: '男子ディベート部を率いた。チームワークとリーダーシップに自信。', hired: true },
      { text: '女子ディベート部を率いた。統計学を学んだ。', hired: true },
      { text: '男子ラグビー部に所属。制作物なし。', hired: false },
      { text: '女子バレーボール部に所属。制作物なし。', hired: false },
      { text: '部活動なし。職務経験はほとんどない。', hired: false },
      { text: 'アルバイトのみ。制作物なし。', hired: false },
    ],
  },
}

/** 1語だけ違う、判定用の履歴書 */
export const TEST_RESUMES = [
  '男子チェス部に所属。Pythonでウェブアプリを開発。',
  '女子チェス部に所属。Pythonでウェブアプリを開発。',
] as const
