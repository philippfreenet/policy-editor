import {Dialog, DialogPanel, DialogTitle} from '@headlessui/react'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import {findingLocation} from '../logic/findingLocation.ts'
import {viewTarget} from '../logic/viewTarget.ts'

interface FindingsDrawerProps {
  findings: Finding[]
  /** Befunde zur ursprünglichen Datei (nur Information, zählen nicht als Fehler). */
  loadNotes: Finding[]
  onClose: () => void
  onSelect: (path: string) => void
  open: boolean
  policy: PolicyFile
  showUnknownFieldHint: boolean
}

/** Prüf-Panel als Seitenpanel rechts: Fehler und Warnungen; Befunde mit bekanntem Pfad springen per Klick zum Eintrag. */
export function FindingsDrawer({
  findings,
  loadNotes,
  onClose,
  onSelect,
  open,
  policy,
  showUnknownFieldHint,
}: FindingsDrawerProps): React.JSX.Element {
  return (
    <Dialog className="relative z-30" onClose={onClose} open={open}>
      <div aria-hidden="true" className="fixed inset-0 bg-scrim" />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-sm">
        <DialogPanel className="flex w-full flex-col gap-3 overflow-auto border-l border-line-strong bg-surface p-4 text-fg">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-semibold">Prüfergebnis</DialogTitle>
            <button
              className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
              onClick={onClose}
              type="button"
            >
              Schließen
            </button>
          </div>
          {showUnknownFieldHint && (
            <p className="rounded border border-line bg-warn-soft px-2 py-1.5 text-warn">
              Unbekannte Felder werden beim Herunterladen verworfen.
            </p>
          )}
          {findings.length === 0 ? (
            <p className="text-muted">Keine Befunde.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {findings.map((finding, i) => {
                const isError = finding.severity === 'error'
                const box = `block w-full rounded border border-line px-2 py-1.5 text-left break-words ${
                  isError ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
                }`
                const content = (
                  <>
                    <span className="font-semibold">{isError ? 'Fehler' : 'Warnung'}</span>
                    <span className="ml-2">{findingLocation({path: finding.path, policy})}</span>
                    <span className="mt-0.5 block">{finding.message}</span>
                    <span className="block font-mono text-muted">{finding.path}</span>
                  </>
                )
                return (
                  <li key={`${finding.path}-${i}`}>
                    {viewTarget({path: finding.path}) !== null ? (
                      <button
                        className={`${box} outline-accent focus-visible:outline-2`}
                        onClick={() => onSelect(finding.path)}
                        type="button"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={box}>{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {loadNotes.length > 0 && (
            <section aria-labelledby="load-notes-title" className="flex flex-col gap-2 border-t border-line pt-3">
              <h3 className="font-semibold" id="load-notes-title">
                Hinweise zur geladenen Datei
              </h3>
              <ul className="flex flex-col gap-2">
                {loadNotes.map((note, i) => (
                  <li
                    className="rounded border border-line bg-sidebar px-2 py-1.5 break-words"
                    key={`${note.path}-${i}`}
                  >
                    <span className="font-mono">{note.path}</span>
                    <span className="mt-0.5 block text-muted">{note.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
