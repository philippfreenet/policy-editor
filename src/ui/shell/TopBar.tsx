interface TopBarProps {
  canRedo: boolean
  canUndo: boolean
  fileLabel: string
  onDownload: () => void
  onRedo: () => void
  onReload: () => void
  onUndo: () => void
}

const BUTTON =
  'min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'

/** Kürzel-Hinweis passend zur Plattform. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Strg+'

/** Schmale Kopfleiste: Dateiname, Rückgängig/Wiederholen, Neu laden und Herunterladen. */
export function TopBar({
  canRedo,
  canUndo,
  fileLabel,
  onDownload,
  onRedo,
  onReload,
  onUndo,
}: TopBarProps): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-muted">{fileLabel}</span>
      <button
        aria-keyshortcuts="Control+Z Meta+Z"
        className={BUTTON}
        disabled={!canUndo}
        onClick={onUndo}
        title={`Rückgängig (${MOD}Z)`}
        type="button"
      >
        ↶ Rückgängig
      </button>
      <button
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        className={BUTTON}
        disabled={!canRedo}
        onClick={onRedo}
        title={`Wiederholen (${MOD}⇧Z)`}
        type="button"
      >
        ↷ Wiederholen
      </button>
      <button className={BUTTON} onClick={onReload} type="button">
        Neu laden
      </button>
      <button
        className="min-h-6 rounded bg-accent px-3 py-1 text-on-accent outline-accent outline-offset-2 focus-visible:outline-2"
        onClick={onDownload}
        type="button"
      >
        Herunterladen
      </button>
    </header>
  )
}
