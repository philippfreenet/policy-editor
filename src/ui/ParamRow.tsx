import {useState} from 'react'
import type {ParamDef, Scalar} from '../model/PolicyTypes.ts'
import {convertValues, droppedValues, valueType} from './convertValues.ts'
import type {ValueType} from './convertValues.ts'
import {BUTTON, BUTTON_DANGER, INPUT} from './styles.ts'

interface ParamRowProps {
  listId: string
  onChange: (param: ParamDef) => void
  onRemove: () => void
  param: ParamDef
  rowId: string
}

const TYPE_LABELS: Record<ValueType, string> = {boolean: 'Ja/Nein', number: 'Zahl', string: 'Text'}

/** Eine Parameterzeile: Name, Werttyp und Chip-Liste der Werte mit Hinzufügen und Entfernen. */
export function ParamRow({listId, onChange, onRemove, param, rowId}: ParamRowProps): React.JSX.Element {
  const [chosen, setChosen] = useState<ValueType | null>(null)
  const [draft, setDraft] = useState('')
  const [draftBool, setDraftBool] = useState('true')
  const [problem, setProblem] = useState<string | null>(null)
  const type: ValueType = param.values.length > 0 ? valueType({values: param.values}) : (chosen ?? 'string')

  /** Fügt den eingegebenen Wert an, sofern er zum Typ passt. */
  function addValue(): void {
    let value: Scalar | undefined
    if (type === 'boolean') {
      value = draftBool === 'true'
    } else if (type === 'number') {
      value = convertValues({target: 'number', values: [draft]})[0]
      if (value === undefined) {
        setProblem('Nur ganze Zahlen sind erlaubt.')
        return
      }
    } else if (draft.trim().length > 0) {
      value = draft.trim()
    }
    if (value === undefined) {
      setProblem('Bitte einen Wert eingeben.')
      return
    }
    setProblem(null)
    setDraft('')
    onChange({...param, values: [...param.values, value]})
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-800" htmlFor={`${rowId}-name`}>
            Parametername
          </label>
          <input
            className={`${INPUT} font-mono`}
            id={`${rowId}-name`}
            list={listId}
            onChange={(event) => onChange({...param, name: event.target.value})}
            type="text"
            value={param.name}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-800" htmlFor={`${rowId}-type`}>
            Werttyp
          </label>
          <select
            className={INPUT}
            id={`${rowId}-type`}
            onChange={(event) => {
              const target = event.target.value as ValueType
              const dropped = droppedValues({target, values: param.values})
              if (
                dropped.length > 0 &&
                !window.confirm(
                  `Beim Wechsel des Werttyps gehen diese Werte verloren: ${dropped.join(', ')}. Fortfahren?`,
                )
              ) {
                return
              }
              setChosen(target)
              setProblem(null)
              onChange({...param, values: convertValues({target, values: param.values})})
            }}
            value={type}
          >
            {(Object.keys(TYPE_LABELS) as ValueType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          aria-label={`Parameter ${param.name} entfernen`}
          className={`${BUTTON_DANGER} ml-auto`}
          onClick={onRemove}
          type="button"
        >
          Parameter entfernen
        </button>
      </div>
      <ul aria-label={`Werte von ${param.name}`} className="flex flex-wrap gap-1.5">
        {param.values.length === 0 && <li className="text-xs text-slate-700">Keine Werte.</li>}
        {param.values.map((value, i) => (
          <li
            className="flex items-center gap-1 rounded-full border border-slate-400 bg-white py-0.5 pr-1 pl-2.5 font-mono text-xs text-slate-900"
            key={`${String(value)}-${i}`}
          >
            {String(value)}
            <button
              aria-label={`Wert ${String(value)} entfernen`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none text-slate-800 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-indigo-700"
              onClick={() => onChange({...param, values: param.values.filter((_, j) => j !== i)})}
              type="button"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {type === 'boolean' ? (
          <select
            aria-label={`Neuer Wert für ${param.name}`}
            className={INPUT}
            onChange={(event) => setDraftBool(event.target.value)}
            value={draftBool}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            aria-describedby={problem === null ? undefined : `${rowId}-problem`}
            aria-invalid={problem !== null}
            aria-label={`Neuer Wert für ${param.name}`}
            className={`${INPUT} font-mono`}
            inputMode={type === 'number' ? 'numeric' : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addValue()
              }
            }}
            type="text"
            value={draft}
          />
        )}
        <button className={BUTTON} onClick={addValue} type="button">
          Wert hinzufügen
        </button>
        {problem !== null && (
          <span className="text-xs text-red-900" id={`${rowId}-problem`} role="alert">
            {problem}
          </span>
        )}
      </div>
    </li>
  )
}
