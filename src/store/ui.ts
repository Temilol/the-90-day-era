import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'
export interface Toast { id: number; title: string; sub?: string; kind: 'xp' | 'info' | 'warn' | 'success' }
export interface Unlock { id: string; name: string; emoji: string; desc: string; kind: 'badge' | 'level' | 'boss' | 'envelope' }

interface UiState {
  theme: Theme
  setTheme: (t: Theme) => void
  haptics: boolean
  setHaptics: (on: boolean) => void
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  unlocks: Unlock[]
  pushUnlock: (u: Unlock) => void
  shiftUnlock: () => void
  celebration: string | null
  setCelebration: (c: string | null) => void
}

let toastId = 0
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      haptics: true,
      setHaptics: (haptics) => set({ haptics }),
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
    }),
    { name: 'era-ui', partialize: (s) => ({ theme: s.theme, haptics: s.haptics }) },
  ),
)

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#1f1730' : '#a78bfa')
}
