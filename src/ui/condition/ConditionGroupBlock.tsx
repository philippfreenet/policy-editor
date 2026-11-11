import {useId} from 'react'
import type {CompositeNode, Finding, ProviderDef} from '../../model/PolicyTypes.ts'
import {
  dissolveGroupAt,
  insertChildAt,
  moveChildWithin,
  removeNodeAt,
  setOperatorAt,
  type NodePath,
  wrapInGroupAt,
} from '../conditionTreeOps.ts'
import {ActionMenu} from '../kit/ActionMenu.tsx'
import {pathKey} from './findingNodes.ts'
import {FindingList} from './FindingList.tsx'
import {ProviderPicker} from './ProviderPicker.tsx'
import {ProviderRow} from './ProviderRow.tsx'

/** Gemeinsamer Bearbeitungskontext aller Gruppen und Zeilen eines Bedingungsbaums. */
export interface ConditionContext {
  /** Befunde je Knoten, Schlüssel siehe `pathKey`. */
  findings: ReadonlyMap<string, Finding[]>
  /** Meldet den neuen Gesamtbaum. */
  onChange: (next: CompositeNode) => void
  providers: readonly ProviderDef[]
  /** Aktueller Gesamtbaum. */
  root: CompositeNode
}

interface ConditionGroupBlockProps {
  context: ConditionContext
  group: CompositeNode
  path: NodePath
}

const SEGMENT_BASE =
  'min-h-6 px-3 py-1 outline-accent focus-visible:z-10 focus-visible:-outline-offset-2 focus-visible:outline-2'

/** Getönter Block für eine Bedingungsgruppe mit Operator-Umschalter, Kindern und Hinzufügen-Steuerung. */
export function ConditionGroupBlock({context, group, path}: ConditionGroupBlockProps): React.JSX.Element {
  const findingsId = useId()
  const {findings, onChange, providers, root} = context
  const label = ['1', ...path.map((index) => String(index + 1))].join('.')
  const groupLabel = `Gruppe ${label}`
  const own = findings.get(pathKey({path})) ?? []
  const isRoot = path.length === 0
  const lastIndex = path.length - 1
  const isFirst = path[lastIndex] === 0
  const parentPath = path.slice(0, -1)
  const siblingCount = isRoot ? 0 : countChildren({path: parentPath, root})
  const operatorValid = group.operator === 'AND' || group.operator === 'OR'

  const segment = (args: {operator: 'AND' | 'OR'; text: string}): React.JSX.Element => {
    const active = group.operator === args.operator
    return (
      <button
        aria-pressed={active}
        className={`${SEGMENT_BASE} ${active ? 'bg-accent text-on-accent' : 'bg-surface text-fg hover:bg-sidebar'}`}
        onClick={() => {
          onChange(setOperatorAt({operator: args.operator, path, root}))
        }}
        type="button"
      >
        {args.text}
      </button>
    )
  }

  return (
    <div
      aria-describedby={own.length > 0 ? findingsId : undefined}
      aria-label={groupLabel}
      className="flex flex-col gap-2 rounded bg-sidebar p-2"
      role="group"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded border border-line-strong">
          {segment({operator: 'AND', text: 'Alle'})}
          {segment({operator: 'OR', text: 'Mindestens eine'})}
        </div>
        <span>der folgenden treffen zu</span>
        {!isRoot && (
          <div className="ml-auto">
            <ActionMenu
              items={[
                {
                  disabled: isFirst,
                  label: 'Nach oben',
                  onSelect: () => {
                    onChange(moveChildWithin({direction: -1, path, root}))
                  },
                },
                {
                  disabled: path[lastIndex] === siblingCount - 1,
                  label: 'Nach unten',
                  onSelect: () => {
                    onChange(moveChildWithin({direction: 1, path, root}))
                  },
                },
                {
                  label: 'Gruppe auflösen',
                  onSelect: () => {
                    onChange(dissolveGroupAt({path, root}))
                  },
                },
                {
                  danger: true,
                  label: 'Entfernen',
                  onSelect: () => {
                    onChange(removeNodeAt({path, root}))
                  },
                },
              ]}
              label={`Aktionen für ${groupLabel}`}
            />
          </div>
        )}
      </div>
      {!operatorValid && (
        <p className="break-words text-danger">
          {`Ungültiger Operator „${group.operator}“ – Alle oder Mindestens eine wählen`}
        </p>
      )}
      <FindingList findings={own} id={findingsId} />
      {group.conditions.length === 0 && <p className="text-muted">Leere Gruppe – Provider oder Gruppe hinzufügen</p>}
      {group.conditions.map((child, index) => {
        const childPath = [...path, index]
        if (typeof child === 'string') {
          return (
            <ProviderRow
              findings={findings.get(pathKey({path: childPath})) ?? []}
              isFirst={index === 0}
              isLast={index === group.conditions.length - 1}
              key={index}
              name={child}
              onMoveDown={() => {
                onChange(moveChildWithin({direction: 1, path: childPath, root}))
              }}
              onMoveUp={() => {
                onChange(moveChildWithin({direction: -1, path: childPath, root}))
              }}
              onRemove={() => {
                onChange(removeNodeAt({path: childPath, root}))
              }}
              onWrap={() => {
                onChange(wrapInGroupAt({path: childPath, root}))
              }}
              provider={providers.find((p) => p.name === child)}
            />
          )
        }
        return <ConditionGroupBlock context={context} group={child} key={index} path={childPath} />
      })}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          <ProviderPicker
            label="Provider hinzufügen"
            onPick={(name) => {
              onChange(insertChildAt({child: name, path, root}))
            }}
            providers={providers}
          />
        </div>
        <button
          className="min-h-6 rounded border border-line-strong bg-surface px-3 py-1 outline-accent hover:bg-accent-soft focus-visible:outline-2"
          onClick={() => {
            onChange(insertChildAt({child: {conditions: [], operator: 'AND'}, path, root}))
          }}
          type="button"
        >
          + Gruppe
        </button>
      </div>
    </div>
  )
}

/** Zählt die Kinder der Gruppe unter dem Pfad; 0, wenn der Pfad keine Gruppe trifft. */
function countChildren(args: {path: NodePath; root: CompositeNode}): number {
  let current: CompositeNode | string | undefined = args.root
  for (const index of args.path) {
    current = typeof current === 'string' ? undefined : current?.conditions[index]
  }
  return typeof current === 'string' || current === undefined ? 0 : current.conditions.length
}
