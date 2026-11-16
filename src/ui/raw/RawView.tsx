import {useState} from 'react'

interface RawViewProps {
  /** Zahl der geänderten Diff-Zeilen; null, solange sie noch berechnet wird. */
  changedCount: number | null
  onOpenChanges: () => void
  /** Die Datei so, wie sie heruntergeladen würde. */
  text: string
}

/** Schreibgeschützte Rohansicht der policy.json mit Zeilennummern und Kopieren. */
export function RawView({changedCount, onOpenChanges, text}: RawViewProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [numbers, setNumbers] = useState(true)
  const lines = text.split('\n')
  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <section aria-labelledby="raw-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold" id="raw-title">
            Rohansicht
          </h2>
          <p className="text-muted">
            Aktueller Stand der Datei, wie sie heruntergeladen würde ({lines.length} Zeilen).
          </p>
        </div>
        <label className="flex items-center gap-1">
          <input checked={numbers} onChange={(event) => setNumbers(event.target.checked)} type="checkbox" />
          Zeilennummern
        </label>
        <button
          className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
          onClick={onOpenChanges}
          type="button"
        >
          {changedCount === null ? 'Änderungen ansehen' : `Änderungen ansehen (${changedCount})`}
        </button>
        <button
          className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
          onClick={() => void copy()}
          type="button"
        >
          {copied ? 'Kopiert ✓' : 'Kopieren'}
        </button>
      </div>
      <div className="max-h-[75vh] overflow-auto rounded border border-line bg-surface">
        <pre aria-label="policy.json" className="flex font-mono text-xs leading-5" tabIndex={0}>
          {numbers && (
            <code aria-hidden="true" className="select-none border-r border-line px-2 text-right text-muted">
              {lines.map((_, i) => `${i + 1}\n`).join('')}
            </code>
          )}
          <code className="px-3 whitespace-pre">{text}</code>
        </pre>
      </div>
    </section>
  )
}
