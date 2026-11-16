import { clsx } from 'clsx'

/** An on/off switch. `label` is read out by screen readers. */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange} className={clsx('w-11 h-6 rounded-full relative transition shrink-0 disabled:opacity-50', on ? 'bg-gradient-to-r from-lavender-500 to-blush-400' : 'bg-line')}>
      <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', on ? 'left-5.5' : 'left-0.5')} />
    </button>
  )
}
