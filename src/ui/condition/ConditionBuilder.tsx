import {useMemo} from 'react'
import type {CompositeNode, Finding, ProviderDef} from '../../model/PolicyTypes.ts'
import {formatCondition} from '../../model/formatCondition.ts'
import {ConditionGroupBlock} from './ConditionGroupBlock.tsx'
import {groupFindingsByNode} from './findingNodes.ts'

interface ConditionBuilderProps {
  /** Befunde des Rechts; nur solche unter `pathPrefix` werden an den Knoten gezeigt. */
  findings: readonly Finding[]
  onChange: (next: CompositeNode | undefined) => void
  /** Pfad der Bedingung in der Datei, z. B. „rights[4].condition“. */
  pathPrefix: string
  providers: readonly ProviderDef[]
  value: CompositeNode | undefined
}

/** Block-Editor für die Bedingung eines Rechts: Gruppen mit Alle/Mindestens eine, Provider-Zeilen und Formel. */
export function ConditionBuilder({
  findings,
  onChange,
  pathPrefix,
  providers,
  value,
}: ConditionBuilderProps): React.JSX.Element {
  const byNode = useMemo(
    () =>
      value === undefined
        ? new Map<string, Finding[]>()
        : groupFindingsByNode({findings, prefix: pathPrefix, root: value}),
    [findings, pathPrefix, value],
  )
  if (value === undefined) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Gilt immer</span>
        <button
          className="min-h-6 rounded border border-line-strong bg-surface px-3 py-1 outline-accent hover:bg-sidebar focus-visible:outline-2"
          onClick={() => {
            onChange({conditions: [], operator: 'AND'})
          }}
          type="button"
        >
          + Bedingung
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <ConditionGroupBlock context={{findings: byNode, onChange, providers, root: value}} group={value} path={[]} />
      <p className="font-mono break-words text-muted">{formatCondition({node: value})}</p>
      <div>
        <button
          className="min-h-6 rounded px-2 py-1 text-danger outline-accent hover:bg-danger-soft focus-visible:outline-2"
          onClick={() => {
            onChange(undefined)
          }}
          type="button"
        >
          Bedingung entfernen (gilt immer)
        </button>
      </div>
    </div>
  )
}
