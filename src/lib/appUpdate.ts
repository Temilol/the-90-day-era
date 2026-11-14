/**
 * Keeps the installed app up to date without getting in the way.
 *  - Looks for a new version when the app loads, each time it comes back to the foreground,
 *    and once an hour while it stays open.
 *  - When one is ready, waits for a moment when nothing would be lost before switching to it.
 */

const CHECK_GAP_MS = 5 * 60_000 // don't ask the server more often than this
const TYPING_QUIET_MS = 2 * 60_000 // no typing for this long before a refresh
const TOUCH_QUIET_MS = 15_000 // and no taps for this long, if the app is on screen

export interface RefreshSituation { hidden: boolean; dialogOpen: boolean; fieldFocused: boolean; msSinceTyping: number; msSinceTouch: number }

/** Whether switching to the new version right now would interrupt anything. */
export function safeToRefresh(s: RefreshSituation): boolean {
  if (s.dialogOpen || s.fieldFocused) return false
  if (s.msSinceTyping < TYPING_QUIET_MS) return false
  return s.hidden || s.msSinceTouch >= TOUCH_QUIET_MS
}

export function setUpAppUpdates(register: (options: {
  immediate?: boolean
  onNeedRefresh?: () => void
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void
}) => (reloadPage?: boolean) => Promise<void>) {
  let lastTyping = 0
  let lastTouch = 0
  let waiting = false
  let timer: ReturnType<typeof setInterval> | null = null

  const situation = (): RefreshSituation => {
    const el = document.activeElement as HTMLElement | null
    const now = Date.now()
    return {
      hidden: document.visibilityState === 'hidden',
      dialogOpen: !!document.querySelector('[role="dialog"]'),
      fieldFocused: !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range'].includes((el as HTMLInputElement).type))),
      msSinceTyping: now - lastTyping,
      msSinceTouch: now - lastTouch,
    }
  }
  const tryRefresh = () => {
    if (!waiting || !safeToRefresh(situation())) return
    waiting = false
    if (timer) { clearInterval(timer); timer = null }
    void updateSW(true)
  }

  const updateSW = register({
    immediate: true,
    onNeedRefresh() {
      waiting = true
      tryRefresh()
      if (waiting && !timer) timer = setInterval(tryRefresh, 10_000)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      let lastCheck = Date.now()
      const check = () => {
        if (Date.now() - lastCheck < CHECK_GAP_MS || navigator.onLine === false) return
        lastCheck = Date.now()
        registration.update().catch(() => { /* offline or server busy: the next check will do */ })
      }
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
      window.addEventListener('online', check)
      setInterval(check, 60 * 60_000)
    },
  })

  document.addEventListener('input', () => { lastTyping = Date.now() }, true)
  document.addEventListener('pointerdown', () => { lastTouch = Date.now() }, true)
  document.addEventListener('visibilitychange', tryRefresh)
}
