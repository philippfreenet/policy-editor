import type {ProviderDef} from '../model/PolicyTypes.ts'
import {BUTTON, BUTTON_DANGER, INPUT} from './styles.ts'

interface ConditionLeafProps {
  label: string
  onChange: (name: string) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  providers: readonly ProviderDef[]
  value: string
}

/** Blatt des Bedingungsbaums: Auswahl eines Providers mit Beschreibung als Hinweis, Verschieben und Entfernen. */
export function ConditionLeaf({
  label,
  onChange,
  onMove,
  onRemove,
  providers,
  value,
}: ConditionLeafProps): React.JSX.Element {
  const names = providers.map((p) => p.name).sort((a, b) => a.localeCompare(b))
  const known = names.includes(value)
  const description = providers.find((p) => p.name === value)?.description
  const hintId = `condition-${label}-hint`

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-white p-2">
      <select
        aria-describedby={description === undefined ? undefined : hintId}
        aria-label={`Provider für Bedingung ${label}`}
        aria-invalid={!known}
        className={`${INPUT} min-w-0 max-w-full font-mono ${known ? '' : 'border-red-600'}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {!known && <option value={value}>{value.length === 0 ? '(leer)' : `${value} (unbekannt)`}</option>}
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {description !== undefined && (
        <span className="min-w-0 flex-1 text-xs text-slate-700" id={hintId}>
          {description}
        </span>
      )}
      <span className="ml-auto flex gap-1">
        <button aria-label={`Bedingung ${label} nach oben`} className={BUTTON} onClick={() => onMove(-1)} type="button">
          ↑
        </button>
        <button aria-label={`Bedingung ${label} nach unten`} className={BUTTON} onClick={() => onMove(1)} type="button">
          ↓
        </button>
        <button aria-label={`Bedingung ${label} entfernen`} className={BUTTON_DANGER} onClick={onRemove} type="button">
          Entfernen
        </button>
      </span>
    </div>
  )
}
