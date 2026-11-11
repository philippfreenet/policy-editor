import {useRef} from 'react'
import type {ParamDef} from '../model/PolicyTypes.ts'
import {ParamRow} from './ParamRow.tsx'
import {uniqueName} from './uniqueName.ts'

const BUTTON =
  'min-h-6 rounded border border-line-strong bg-surface px-2 py-0.5 outline-accent hover:bg-sidebar focus-visible:outline-2'

interface ParamEditorProps {
  idPrefix: string
  onChange: (params: ParamDef[] | undefined) => void
  params: readonly ParamDef[]
  suggestions: readonly string[]
}

/** Parameterliste eines Providers; eine leere Liste wird als „keine params“ (undefined) gemeldet. */
export function ParamEditor({idPrefix, onChange, params, suggestions}: ParamEditorProps): React.JSX.Element {
  const listId = `${idPrefix}-suggestions`
  const nextId = useRef(0)
  const rowKeys = useRef<number[]>([])

  /* Stabile Zeilenschlüssel: bei abweichender Länge (z. B. anderer Provider) wird aufgefüllt bzw. gekürzt. */
  while (rowKeys.current.length < params.length) {
    rowKeys.current.push(nextId.current++)
  }
  rowKeys.current.length = params.length

  /** Meldet die neue Liste; leer bedeutet: Schlüssel weglassen. */
  function emit(next: ParamDef[]): void {
    onChange(next.length === 0 ? undefined : next)
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">Parameter</legend>
      <datalist id={listId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {params.length === 0 && <p className="text-muted">Keine Parameter.</p>}
      <ul className="flex flex-col gap-2">
        {params.map((param, i) => (
          <ParamRow
            key={rowKeys.current[i]}
            listId={listId}
            onChange={(changed) => emit(params.map((p, j) => (j === i ? changed : p)))}
            onRemove={() => {
              rowKeys.current.splice(i, 1)
              emit(params.filter((_, j) => j !== i))
            }}
            param={param}
            rowId={`${idPrefix}-param-${i}`}
          />
        ))}
      </ul>
      <div>
        <button
          className={BUTTON}
          onClick={() =>
            emit([...params, {name: uniqueName({base: 'Parameter', taken: params.map((p) => p.name)}), values: []}])
          }
          type="button"
        >
          Parameter hinzufügen
        </button>
      </div>
    </fieldset>
  )
}
