import type {Finding} from '../model/PolicyTypes.ts'
import {parseFindingPath} from './pathTarget.ts'

interface ValidationPanelProps {
  findings: Finding[]
  /** Befunde zur ursprünglichen Datei (nur Information, zählen nicht als Fehler). */
  loadNotes: Finding[]
  onSelect: (path: string) => void
  showUnknownFieldHint: boolean
}

/** Seitenleiste mit allen Befunden; Fehler rot, Warnungen gelb; Befunde mit bekanntem Pfad springen per Klick zum Eintrag. */
export function ValidationPanel({
  findings,
  loadNotes,
  onSelect,
  showUnknownFieldHint,
}: ValidationPanelProps): React.JSX.Element {
  return (
    <aside aria-labelledby="validation-title" className="flex flex-col gap-3 border-l border-slate-300 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-900" id="validation-title">
        Prüfergebnis
      </h2>
      {showUnknownFieldHint && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          Unbekannte Felder werden beim Herunterladen verworfen.
        </p>
      )}
      {findings.length === 0 ? (
        <p className="text-sm text-slate-700">Keine Befunde.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((finding, i) => {
            const isError = finding.severity === 'error'
            const clickable = parseFindingPath({path: finding.path}) !== null
            const box = `block w-full rounded-md border px-2 py-1.5 text-left text-xs ${
              isError ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'
            }`
            const content = (
              <>
                <span className="font-semibold">{isError ? 'Fehler' : 'Warnung'}</span>
                <span className="ml-2 font-mono opacity-80">{finding.path}</span>
                <span className="mt-0.5 block">{finding.message}</span>
              </>
            )
            return (
              <li key={`${finding.path}-${i}`}>
                {clickable ? (
                  <button
                    className={`${box} hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700`}
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
        <section aria-labelledby="load-notes-title" className="flex flex-col gap-2 border-t border-slate-300 pt-3">
          <h3 className="text-sm font-semibold text-slate-900" id="load-notes-title">
            Hinweise zur geladenen Datei
          </h3>
          <ul className="flex flex-col gap-2">
            {loadNotes.map((note, i) => (
              <li
                className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
                key={`${note.path}-${i}`}
              >
                <span className="font-mono opacity-80">{note.path}</span>
                <span className="mt-0.5 block">{note.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
