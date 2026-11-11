interface HeaderProps {
  errorCount: number
  fileLabel: string
  onDiff: () => void
  onDownload: () => void
  onReload: () => void
  warningCount: number
}

const BUTTON =
  'rounded-md border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

/** Kopfzeile: Dateiname, Zähler für Fehler und Warnungen sowie die Hauptaktionen. */
export function Header({
  errorCount,
  fileLabel,
  onDiff,
  onDownload,
  onReload,
  warningCount,
}: HeaderProps): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-300 bg-white px-4 py-2">
      <h1 className="text-base font-semibold text-slate-900">policy-editor</h1>
      <span className="text-sm text-slate-700">{fileLabel}</span>
      <p aria-live="polite" className="flex gap-2 text-xs font-medium">
        <span
          className={`rounded-full px-2 py-0.5 ${errorCount > 0 ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-700'}`}
        >
          {errorCount} Fehler
        </span>
        <span
          className={`rounded-full px-2 py-0.5 ${warningCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}
        >
          {warningCount} {warningCount === 1 ? 'Warnung' : 'Warnungen'}
        </span>
      </p>
      <div className="ml-auto flex flex-wrap gap-2">
        <button className={BUTTON} onClick={onDiff} type="button">
          Änderungen ansehen
        </button>
        <button
          className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          onClick={onDownload}
          type="button"
        >
          Herunterladen
        </button>
        <button className={BUTTON} onClick={onReload} type="button">
          Neu laden
        </button>
      </div>
    </header>
  )
}
