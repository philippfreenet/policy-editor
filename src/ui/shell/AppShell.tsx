interface AppShellProps {
  children: React.ReactNode
  /** Seitenpanel (z. B. Prüf-Panel), das über dem Rahmen liegt; null, wenn keines offen ist. */
  drawer: React.ReactNode | null
  /** Meldung aus dem Editor-Zustand; null blendet sie aus. */
  error?: string | null
  /** Schließt die Fehlermeldung. */
  onClearError?: () => void
  sidebar: React.ReactNode
  topBar: React.ReactNode
}

/** Rahmen der Anwendung: Seitenleiste links (stapelt sich unter 1024 px oben), Kopfleiste, schließbare Fehlermeldung und Hauptbereich. */
export function AppShell({
  children,
  drawer,
  error = null,
  onClearError,
  sidebar,
  topBar,
}: AppShellProps): React.JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas text-fg lg:grid-cols-[200px_minmax(0,1fr)]">
      {sidebar}
      <div className="flex min-w-0 flex-col">
        {topBar}
        {error !== null && (
          <div
            className="flex items-start gap-3 border-b border-line bg-danger-soft px-4 py-2 text-danger"
            role="alert"
          >
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              aria-label="Meldung schließen"
              className="min-h-6 min-w-6 rounded outline-accent focus-visible:outline-2"
              onClick={onClearError}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
      {drawer}
    </div>
  )
}
