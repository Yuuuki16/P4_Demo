// アンケートを「1ブラウザにつき1回」にするための、匿名IDと回答済みの印。
// ログインがないので、別のブラウザやシークレットウィンドウ、履歴の削除では別人として扱われる。
// サーバーは同じIDの回答を2回目以降は保存しない（store_postgres.go / store.go）。

const ID_KEY = 'blackbox.respondentId'
const ANSWERED_KEY = 'blackbox.answered'

// Safari のプライベートブラウズなど、localStorage が使えない環境でも落ちないように
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 保存できなくても体験は続けられる（その場合は再読み込みで再回答できてしまう）
  }
}

let fallbackId: string | null = null

/** このブラウザの匿名ID。初回に作って保存し、以後は同じものを返す */
export function respondentId(): string {
  const saved = read(ID_KEY)
  if (saved) return saved
  const id = fallbackId ?? crypto.randomUUID()
  fallbackId = id
  write(ID_KEY, id)
  return id
}

/** このブラウザでアンケートを回答済みか */
export function hasAnswered(): boolean {
  return read(ANSWERED_KEY) === '1'
}

export function markAnswered() {
  write(ANSWERED_KEY, '1')
}

const CONSENT_KEY = 'blackbox.consented'

/** このブラウザで、アンケート前の説明に同意済みか（同意の画面は1回だけ出す） */
export function hasConsented(): boolean {
  return read(CONSENT_KEY) === '1'
}

export function markConsented() {
  write(CONSENT_KEY, '1')
}
