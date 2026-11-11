/** Farbtöne eines Chips. */
export type ChipTone = 'danger' | 'neutral' | 'where' | 'who'

interface ChipProps {
  children: React.ReactNode
  /** Zeigt einen Entfernen-Knopf, wenn gesetzt. */
  onRemove?: () => void
  /** Zugänglicher Name des Entfernen-Knopfs, z. B. „admin entfernen“. */
  removeLabel?: string
  tone: ChipTone
}

const TONE_CLASS: Record<ChipTone, string> = {
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-sidebar text-fg',
  where: 'bg-where text-where-fg',
  who: 'bg-who text-who-fg',
}

/** Kleine Marke für Rollen, Channels und Hinweise; optional mit Entfernen-Knopf. */
export function Chip({children, onRemove, removeLabel, tone}: ChipProps): React.JSX.Element {
  return (
    <span className={`inline-flex min-h-6 max-w-full items-center gap-1 rounded px-2 break-words ${TONE_CLASS[tone]}`}>
      <span className="min-w-0 break-words">{children}</span>
      {onRemove !== undefined && (
        <button
          aria-label={removeLabel ?? 'Entfernen'}
          className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded outline-accent hover:bg-black/10 focus-visible:outline-2"
          onClick={onRemove}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  )
}
