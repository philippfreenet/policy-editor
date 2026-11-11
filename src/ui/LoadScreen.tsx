import {useState} from 'react'
import {ErrorBox} from './ErrorBox.tsx'

interface LoadScreenProps {
  error: string | null
  onCancel: (() => void) | null
  onClearError: () => void
  onLoad: (text: string) => void
  onNew: () => void
}

/** Startansicht: policy.json per Dateiauswahl, Drag and Drop oder Einfügen laden oder eine leere Konfiguration beginnen. */
export function LoadScreen({error, onCancel, onClearError, onLoad, onNew}: LoadScreenProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)

  /** Liest die Datei lokal im Browser und lädt ihren Inhalt. */
  async function loadFile(file: File | undefined): Promise<void> {
    if (file === undefined) {
      return
    }
    onLoad(await file.text())
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">policy-editor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bearbeitet die policy.json des policy-service. Alles läuft lokal im Browser, es werden keine Daten übertragen.
        </p>
      </header>

      {error !== null && <ErrorBox message={error} onDismiss={onClearError} />}

      <label
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600 ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400'
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
        <span className="font-medium text-slate-900">policy.json auswählen</span>
        <span className="text-slate-600">oder Datei hierher ziehen</span>
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-900" htmlFor="policy-text">
          Oder JSON einfügen
        </label>
        <textarea
          className="h-40 rounded-md border border-slate-300 bg-white p-2 font-mono text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
          id="policy-text"
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          value={text}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={text.trim().length === 0}
          onClick={() => onLoad(text)}
          type="button"
        >
          Laden
        </button>
        <button
          className="rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          onClick={onNew}
          type="button"
        >
          Leere Konfiguration
        </button>
        {onCancel !== null && (
          <button
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            onClick={onCancel}
            type="button"
          >
            Abbrechen
          </button>
        )}
      </div>
    </main>
  )
}
