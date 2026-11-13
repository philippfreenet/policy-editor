import type {View} from '../logic/viewTarget.ts'

interface SidebarProps {
  /** Zahl der geänderten Diff-Zeilen; null, solange sie noch berechnet wird. */
  changedCount: number | null
  counts: {channels: number; providers: number; rights: number}
  errorCount: number
  onOpenChanges: () => void
  onOpenFindings: () => void
  onSelect: (view: View) => void
  view: View
  warningCount: number
}

const BUTTON = 'min-h-6 rounded outline-accent focus-visible:outline-2'

/** Text für den Prüfstatus der Datei. */
function statusText(args: {errorCount: number; warningCount: number}): string {
  if (args.errorCount === 0 && args.warningCount === 0) {
    return '✓ Datei gültig'
  }
  const errors = `${args.errorCount} Fehler`
  const warnings = `${args.warningCount} ${args.warningCount === 1 ? 'Warnung' : 'Warnungen'}`
  return `${errors} · ${warnings}`
}

/** Seitenleiste: Navigation mit Zählern, Änderungs-Link und Prüfstatus. */
export function Sidebar({
  changedCount,
  counts,
  errorCount,
  onOpenChanges,
  onOpenFindings,
  onSelect,
  view,
  warningCount,
}: SidebarProps): React.JSX.Element {
  const items: {count: number | null; label: string; view: View}[] = [
    {count: counts.rights, label: 'Rechte', view: 'rights'},
    {count: counts.providers, label: 'Provider', view: 'providers'},
    {count: counts.channels, label: 'Channels', view: 'channels'},
    {count: null, label: 'Übersicht', view: 'overview'},
  ]
  const clean = errorCount === 0 && warningCount === 0
  return (
    <aside className="flex flex-col gap-4 border-b border-line bg-sidebar p-3 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
      <h1 className="px-2 text-base font-semibold">policy-editor</h1>
      <nav aria-label="Bereiche">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {items.map((item) => (
            <li key={item.view}>
              <button
                aria-current={item.view === view ? 'page' : undefined}
                className={`${BUTTON} flex w-full items-center justify-between gap-2 px-2 py-1 text-left ${
                  item.view === view ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-accent-soft'
                }`}
                onClick={() => onSelect(item.view)}
                type="button"
              >
                <span>{item.label}</span>
                {item.count !== null && <span className="text-muted">{item.count}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-1 lg:mt-auto">
        <button
          className={`${BUTTON} px-2 py-1 text-left text-muted hover:text-fg`}
          onClick={onOpenChanges}
          type="button"
        >
          {changedCount === null ? 'Änderungen' : `Änderungen (${changedCount})`}
        </button>
        <button
          className={`${BUTTON} px-2 py-1 text-left ${
            clean ? 'text-ok' : errorCount > 0 ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
          }`}
          onClick={onOpenFindings}
          type="button"
        >
          {statusText({errorCount, warningCount})}
        </button>
      </div>
    </aside>
  )
}
