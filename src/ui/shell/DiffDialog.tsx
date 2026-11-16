import {Dialog, DialogPanel, DialogTitle} from '@headlessui/react'
import {useState} from 'react'
import {buildDiffRows, isUnchanged, toSplitRows} from '../diffRows.ts'

interface DiffDialogProps {
  current: string
  onClose: () => void
  open: boolean
  original: string | null
}

const ROW_STYLE = {
  added: 'bg-ok/15 text-fg',
  collapsed: 'bg-sidebar text-muted italic',
  context: 'text-fg',
  removed: 'bg-danger-soft text-danger',
} as const

const SIDE_STYLE = {
  added: 'bg-ok/15 text-fg',
  context: 'text-fg',
  removed: 'bg-danger-soft text-danger',
} as const

const MARKER = {added: '+', collapsed: ' ', context: ' ', removed: '-'} as const

/** Dialog mit zeilenweisem Diff gegen die geladene Datei; Esc oder „Schließen“ beendet ihn. */
export function DiffDialog({current, onClose, open, original}: DiffDialogProps): React.JSX.Element {
  const [full, setFull] = useState(true)
  const [numbers, setNumbers] = useState(true)
  const [mode, setMode] = useState<'split' | 'unified'>('unified')
  const rows = buildDiffRows({context: 3, current, original: original ?? ''})
  return (
    <Dialog className="relative z-40" onClose={onClose} open={open}>
      <div aria-hidden="true" className="fixed inset-0 bg-scrim" />
      <div className={`fixed inset-0 flex items-center justify-center ${full ? 'p-0' : 'p-4'}`}>
        <DialogPanel
          className={`flex w-full flex-col border ${
            full ? 'h-full max-w-none' : `max-h-[85vh] rounded ${mode === 'split' ? 'max-w-7xl' : 'max-w-4xl'}`
          } border-line-strong bg-surface text-fg`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <DialogTitle className="text-base font-semibold">Änderungen</DialogTitle>
            <div aria-label="Darstellung" className="ml-auto mr-3 flex gap-1" role="group">
              {(['unified', 'split'] as const).map((value) => (
                <button
                  aria-pressed={mode === value}
                  className={`min-h-6 rounded border px-3 py-1 outline-accent focus-visible:outline-2 ${
                    mode === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong'
                  }`}
                  key={value}
                  onClick={() => setMode(value)}
                  type="button"
                >
                  {value === 'unified' ? 'Untereinander' : 'Nebeneinander'}
                </button>
              ))}
            </div>
            <label className="mr-3 flex items-center gap-1">
              <input checked={numbers} onChange={(event) => setNumbers(event.target.checked)} type="checkbox" />
              Zeilennummern
            </label>
            <button
              aria-pressed={full}
              className="mr-3 min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
              onClick={() => setFull(!full)}
              type="button"
            >
              {full ? 'Verkleinern' : 'Vollbild'}
            </button>
            <button
              className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
              onClick={onClose}
              type="button"
            >
              Schließen
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isUnchanged({rows}) ? (
              <p>Keine Änderungen</p>
            ) : mode === 'split' ? (
              <div className="font-mono leading-5" role="table">
                <div className="grid grid-cols-2 gap-px px-2 pb-1 text-muted" role="row">
                  <span role="columnheader">Original</span>
                  <span role="columnheader">Aktuell</span>
                </div>
                {toSplitRows({rows}).map((row, i) =>
                  row.kind === 'collapsed' ? (
                    <div className={`px-2 ${ROW_STYLE.collapsed}`} key={i} role="row">
                      {`… ${row.count} unveränderte Zeilen …`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-px" key={i} role="row">
                      {[row.left, row.right].map((side, n) => (
                        <div
                          className={`min-w-0 px-2 break-words whitespace-pre-wrap ${side === null ? 'bg-sidebar' : SIDE_STYLE[side.kind]}`}
                          key={n}
                          role="cell"
                        >
                          {numbers && (
                            <span
                              aria-hidden="true"
                              className="mr-2 inline-block w-10 text-right text-muted select-none"
                            >
                              {side?.no ?? ''}
                            </span>
                          )}
                          {side === null ? ' ' : side.text}
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <pre className="font-mono leading-5">
                {rows.map((row, i) => (
                  <div className={`px-2 whitespace-pre-wrap ${ROW_STYLE[row.kind]}`} key={i}>
                    {row.kind === 'collapsed' ? (
                      `… ${row.count} unveränderte Zeilen …`
                    ) : (
                      <>
                        {numbers && (
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex w-20 justify-between text-muted select-none"
                          >
                            <span className="w-9 text-right">{row.oldNo}</span>
                            <span className="w-9 text-right">{row.newNo}</span>
                          </span>
                        )}
                        {`${MARKER[row.kind]} ${row.text}`}
                      </>
                    )}
                  </div>
                ))}
              </pre>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
