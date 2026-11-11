import {useEffect, useRef} from 'react'
import {buildDiffRows, isUnchanged} from './diffRows.ts'

interface DiffDialogProps {
  current: string
  onClose: () => void
  original: string | null
}

const ROW_STYLE = {
  added: 'bg-green-100 text-green-950',
  collapsed: 'bg-slate-100 text-slate-600 italic',
  context: 'text-slate-800',
  removed: 'bg-red-100 text-red-950',
} as const

const MARKER = {added: '+', collapsed: ' ', context: ' ', removed: '-'} as const

/** Modaler Dialog mit zeilenweisem Diff gegen die geladene Datei; Esc oder „Schließen" beendet ihn. */
export function DiffDialog({current, onClose, original}: DiffDialogProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  const rows = buildDiffRows({context: 3, current, original: original ?? ''})

  useEffect(() => {
    const dialog = ref.current
    if (dialog !== null && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  return (
    <dialog
      aria-labelledby="diff-title"
      className="m-auto flex max-h-[85vh] w-[min(60rem,95vw)] flex-col rounded-lg border border-slate-400 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
      onClose={onClose}
      ref={ref}
    >
      <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900" id="diff-title">
          Änderungen
        </h2>
        <button
          className="rounded-md border border-slate-400 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          onClick={() => ref.current?.close()}
          type="button"
        >
          Schließen
        </button>
      </div>
      <div className="overflow-auto p-4">
        {isUnchanged({rows}) ? (
          <p className="text-sm text-slate-800">Keine Änderungen</p>
        ) : (
          <pre className="font-mono text-xs leading-5">
            {rows.map((row, i) => (
              <div className={`whitespace-pre-wrap px-2 ${ROW_STYLE[row.kind]}`} key={i}>
                {row.kind === 'collapsed' ? `… ${row.count} unveränderte Zeilen …` : `${MARKER[row.kind]} ${row.text}`}
              </div>
            ))}
          </pre>
        )}
      </div>
    </dialog>
  )
}
