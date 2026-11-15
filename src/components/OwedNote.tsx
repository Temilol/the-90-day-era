import { RotateCcw } from 'lucide-react'

/** Shown instead of a negative balance: a bonus that had already been spent was removed. */
export function OwedNote({ owed }: { owed: number }) {
  if (owed <= 0) return null
  return (
    <div role="status" className="mt-2 text-xs">
      <div className="font-semibold text-amber-600 dark:text-amber-300 flex items-center gap-1.5"><RotateCcw size={12} className="shrink-0" /> {owed} XP to earn back first</div>
      <div className="text-muted mt-0.5">A bonus you had already spent was removed. Your rewards are still yours.</div>
    </div>
  )
}
