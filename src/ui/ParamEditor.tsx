import type {ParamDef} from '../model/PolicyTypes.ts'
import {ParamRow} from './ParamRow.tsx'
import {BUTTON} from './styles.ts'
import {uniqueName} from './uniqueName.ts'

interface ParamEditorProps {
  idPrefix: string
  onChange: (params: ParamDef[] | undefined) => void
  params: readonly ParamDef[]
  suggestions: readonly string[]
}

/** Parameterliste eines Providers; eine leere Liste wird als „keine params“ (undefined) gemeldet. */
export function ParamEditor({idPrefix, onChange, params, suggestions}: ParamEditorProps): React.JSX.Element {
  const listId = `${idPrefix}-suggestions`

  /** Meldet die neue Liste; leer bedeutet: Schlüssel weglassen. */
  function emit(next: ParamDef[]): void {
    onChange(next.length === 0 ? undefined : next)
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-slate-900">Parameter</legend>
      <datalist id={listId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {params.length === 0 && <p className="text-xs text-slate-700">Keine Parameter.</p>}
      <ul className="flex flex-col gap-2">
        {params.map((param, i) => (
          <ParamRow
            key={i}
            listId={listId}
            onChange={(changed) => emit(params.map((p, j) => (j === i ? changed : p)))}
            onRemove={() => emit(params.filter((_, j) => j !== i))}
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
