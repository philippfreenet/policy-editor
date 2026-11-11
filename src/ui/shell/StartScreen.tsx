import {useState} from 'react'

interface StartScreenProps {
  error: string | null
  hasAutosave: boolean
  onCancel: (() => void) | null
  onClearError: () => void
  onLoad: (text: string) => void
  onNew: () => void
  onResume: (() => void) | null
}

const BUTTON = 'min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2'

/** Startbildschirm: policy.json per Dateiauswahl, Drag and Drop oder Einfügen laden, neu beginnen oder den letzten Stand fortsetzen. */
export function StartScreen({
  error,
  hasAutosave,
  onCancel,
  onClearError,
  onLoad,
  onNew,
  onResume,
}: StartScreenProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)

  /** Liest die Datei lokal im Browser und lädt ihren Inhalt. */
  async function loadFile(file: File | undefined): Promise<void> {
    if (file === undefined) {
      return
    }
    try {
      const content = await file.text()
      setReadError(null)
      onLoad(content)
    } catch (e) {
      setReadError(`Datei konnte nicht gelesen werden: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-10 text-fg">
      <header>
        <h1 className="text-xl font-semibold">policy-editor</h1>
        <p className="mt-1 text-muted">
          Bearbeitet die policy.json des policy-service. Alles läuft lokal im Browser, es werden keine Daten übertragen.
        </p>
        {hasAutosave && (
          <p className="mt-1 text-muted">Aktueller Stand bleibt erhalten, bis eine neue Datei geladen wird.</p>
        )}
      </header>

      {error !== null && (
        <div
          className="flex items-start gap-3 rounded border border-line bg-danger-soft px-3 py-2 text-danger"
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
      {readError !== null && (
        <div
          className="flex items-start gap-3 rounded border border-line bg-danger-soft px-3 py-2 text-danger"
          role="alert"
        >
          <p className="min-w-0 flex-1 break-words">{readError}</p>
          <button
            aria-label="Meldung schließen"
            className="min-h-6 min-w-6 rounded outline-accent focus-visible:outline-2"
            onClick={() => setReadError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <label
        className={`flex cursor-pointer flex-col items-center gap-1 rounded border border-dashed px-4 py-8 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'
        }`}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void loadFile(event.dataTransfer.files[0])
        }}
      >
        <span className="font-medium">policy.json auswählen</span>
        <span className="text-muted">oder Datei hierher ziehen</span>
        <input
          accept=".json,application/json"
          className="sr-only"
          onChange={(event) => {
            void loadFile(event.target.files?.[0])
            event.target.value = ''
          }}
          type="file"
        />
      </label>

      <div className="flex flex-col gap-1">
        <label className="font-medium" htmlFor="policy-text">
          Oder JSON einfügen
        </label>
        <textarea
          className="h-40 rounded border border-line-strong bg-surface p-2 font-mono outline-accent focus-visible:outline-2"
          id="policy-text"
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          value={text}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-6 rounded bg-accent px-3 py-1 text-on-accent outline-accent outline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={text.trim().length === 0}
          onClick={() => onLoad(text)}
          type="button"
        >
          Laden
        </button>
        <button className={BUTTON} onClick={onNew} type="button">
          Leere Konfiguration anlegen
        </button>
        {onResume !== null && (
          <button className={BUTTON} onClick={onResume} type="button">
            Letzten Stand fortsetzen
          </button>
        )}
        {onCancel !== null && (
          <button className={BUTTON} onClick={onCancel} type="button">
            Abbrechen
          </button>
        )}
      </div>
    </main>
  )
}
