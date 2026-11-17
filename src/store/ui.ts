import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'
export interface Toast { id: number; title: string; sub?: string; kind: 'xp' | 'info' | 'warn' | 'success' }
export interface Ask { message: string; confirmLabel: string; cancelLabel: string; danger: boolean; resolve: (ok: boolean) => void }
export interface Unlock { id: string; name: string; emoji: string; desc: string; kind: 'badge' | 'level' | 'boss' | 'envelope' }

interface UiState {
  theme: Theme
  setTheme: (t: Theme) => void
  haptics: boolean
  setHaptics: (on: boolean) => void
  blurPhotos: boolean
  setBlurPhotos: (on: boolean) => void
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  unlocks: Unlock[]
  pushUnlock: (u: Unlock) => void
  shiftUnlock: () => void
  celebration: string | null
  setCelebration: (c: string | null) => void
  ask: Ask | null
  /** Ask a yes/no question in the app itself. Resolves true only when the person confirms. */
  confirm: (message: string, opts?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean }) => Promise<boolean>
  answer: (ok: boolean) => void
}

let toastId = 0
export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      haptics: true,
      setHaptics: (haptics) => set({ haptics }),
      blurPhotos: true,
      setBlurPhotos: (blurPhotos) => set({ blurPhotos }),
      toasts: [],
      pushToast: (t) => {
        const id = ++toastId
        set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      unlocks: [],
      pushUnlock: (u) => set((s) => ({ unlocks: [...s.unlocks, u] })),
      shiftUnlock: () => set((s) => ({ unlocks: s.unlocks.slice(1) })),
      celebration: null,
      setCelebration: (celebration) => set({ celebration }),
      ask: null,
      confirm: (message, opts) => new Promise<boolean>((resolve) => {
        get().ask?.resolve(false) // a question still open is answered "no"
        set({ ask: { message, confirmLabel: opts?.confirmLabel ?? 'Yes', cancelLabel: opts?.cancelLabel ?? 'Cancel', danger: !!opts?.danger, resolve } })
      }),
      answer: (ok) => { const a = get().ask; set({ ask: null }); a?.resolve(ok) },
    }),
    { name: 'era-ui', partialize: (s) => ({ theme: s.theme, haptics: s.haptics, blurPhotos: s.blurPhotos }) },
  ),
)

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#1f1730' : '#a78bfa')
}
