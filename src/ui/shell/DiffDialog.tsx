import {Dialog, DialogPanel, DialogTitle} from '@headlessui/react'
import {buildDiffRows, isUnchanged} from '../diffRows.ts'

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

const MARKER = {added: '+', collapsed: ' ', context: ' ', removed: '-'} as const

/** Dialog mit zeilenweisem Diff gegen die geladene Datei; Esc oder „Schließen“ beendet ihn. */
export function DiffDialog({current, onClose, open, original}: DiffDialogProps): React.JSX.Element {
  const rows = buildDiffRows({context: 3, current, original: original ?? ''})
  return (
    <Dialog className="relative z-40" onClose={onClose} open={open}>
      <div aria-hidden="true" className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded border border-line-strong bg-surface text-fg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <DialogTitle className="text-base font-semibold">Änderungen</DialogTitle>
            <button
              className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
              onClick={onClose}
              type="button"
            >
              Schließen
            </button>
          </div>
          <div className="overflow-auto p-4">
            {isUnchanged({rows}) ? (
              <p>Keine Änderungen</p>
            ) : (
              <pre className="font-mono leading-5">
                {rows.map((row, i) => (
                  <div className={`px-2 whitespace-pre-wrap ${ROW_STYLE[row.kind]}`} key={i}>
                    {row.kind === 'collapsed'
                      ? `… ${row.count} unveränderte Zeilen …`
                      : `${MARKER[row.kind]} ${row.text}`}
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
