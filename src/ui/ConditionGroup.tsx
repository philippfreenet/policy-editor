import type {CompositeNode, ProviderDef} from '../model/PolicyTypes.ts'
import {ConditionLeaf} from './ConditionLeaf.tsx'
import {insertChildAt, moveChildWithin, removeNodeAt, setOperatorAt, updateNodeAt} from './conditionTreeOps.ts'
import type {NodePath} from './conditionTreeOps.ts'
import {BUTTON, BUTTON_DANGER} from './styles.ts'

interface ConditionGroupProps {
  group: CompositeNode
  onChange: (root: CompositeNode) => void
  path: NodePath
  providers: readonly ProviderDef[]
  root: CompositeNode
}

const OPERATORS = [
  {label: 'UND', value: 'AND'},
  {label: 'ODER', value: 'OR'},
] as const

/** Gruppe des Bedingungsbaums: UND/ODER-Umschalter, Kinder (Provider oder Untergruppen) und Hinzufügen-Schaltflächen. */
export function ConditionGroup({group, onChange, path, providers, root}: ConditionGroupProps): React.JSX.Element {
  const label = path.length === 0 ? 'Wurzel' : path.map((i) => i + 1).join('.')
  const firstProvider = providers.map((p) => p.name).sort((a, b) => a.localeCompare(b))[0]
  const isRoot = path.length === 0

  /** Verschiebt die Gruppe oder das Blatt unter dem Pfad innerhalb seiner Elterngruppe. */
  const move = (childPath: NodePath, direction: -1 | 1): void =>
    onChange(moveChildWithin({direction, path: childPath, root}))

  return (
    <div
      aria-label={`Gruppe ${label}`}
      className="flex flex-col gap-2 rounded-md border border-slate-400 bg-slate-50 p-3"
      role="group"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-900">Alle Bedingungen dieser Gruppe verknüpft mit</span>
        <span className="inline-flex gap-1" role="group" aria-label={`Operator der Gruppe ${label}`}>
          {OPERATORS.map((op) => (
            <button
              aria-pressed={group.operator === op.value}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
                group.operator === op.value
                  ? 'border-indigo-700 bg-indigo-700 text-white'
                  : 'border-slate-400 bg-white text-slate-900 hover:bg-slate-100'
              }`}
              key={op.value}
              onClick={() => onChange(setOperatorAt({operator: op.value, path, root}))}
              type="button"
            >
              {op.label}
            </button>
          ))}
        </span>
        {group.operator !== 'AND' && group.operator !== 'OR' && (
          <span className="text-xs text-red-800">Ungültiger Operator „{group.operator}“</span>
        )}
        {!isRoot && (
          <span className="ml-auto flex gap-1">
            <button
              aria-label={`Gruppe ${label} nach oben`}
              className={BUTTON}
              onClick={() => move(path, -1)}
              type="button"
            >
              ↑
            </button>
            <button
              aria-label={`Gruppe ${label} nach unten`}
              className={BUTTON}
              onClick={() => move(path, 1)}
              type="button"
            >
              ↓
            </button>
            <button
              aria-label={`Gruppe ${label} entfernen`}
              className={BUTTON_DANGER}
              onClick={() => onChange(removeNodeAt({path, root}))}
              type="button"
            >
              Entfernen
            </button>
          </span>
        )}
      </div>
      {group.conditions.length === 0 && (
        <p className="text-xs text-red-800">Leere Gruppe: Provider oder Untergruppe hinzufügen.</p>
      )}
      <ul className="flex flex-col gap-2 border-l-2 border-slate-300 pl-3">
        {group.conditions.map((child, index) => {
          const childPath = [...path, index]
          const childLabel = childPath.map((i) => i + 1).join('.')
          return (
            <li key={index}>
              {typeof child === 'string' ? (
                <ConditionLeaf
                  label={childLabel}
                  onChange={(name) => onChange(updateNodeAt({node: name, path: childPath, root}))}
                  onMove={(direction) => move(childPath, direction)}
                  onRemove={() => onChange(removeNodeAt({path: childPath, root}))}
                  providers={providers}
                  value={child}
                />
              ) : (
                <ConditionGroup group={child} onChange={onChange} path={childPath} providers={providers} root={root} />
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          className={BUTTON}
          disabled={firstProvider === undefined}
          onClick={() => onChange(insertChildAt({child: firstProvider as string, path, root}))}
          type="button"
        >
          + Provider
        </button>
        <button
          className={BUTTON}
          onClick={() => onChange(insertChildAt({child: {conditions: [], operator: 'AND'}, path, root}))}
          type="button"
        >
          + Gruppe
        </button>
      </div>
    </div>
  )
}
