import {useEffect, useRef, useState} from 'react'
import {PROVIDER_CLASSES} from '../../constants.ts'
import {deleteProvider, findProviderUsages, renameProviderAt, upsertProvider} from '../../model/operations.ts'
import type {Finding, PolicyFile, ProviderDef} from '../../model/PolicyTypes.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {FieldFindings} from '../FieldFindings.tsx'
import {ActionMenu} from '../kit/ActionMenu.tsx'
import {ConfirmDialog} from '../kit/ConfirmDialog.tsx'
import {InlineEdit} from '../kit/InlineEdit.tsx'
import {describeProvider} from '../logic/describeProvider.ts'
import {findingsAt} from '../logic/findingsAt.ts'
import {rejection} from '../logic/rejection.ts'
import {ParamEditor} from '../ParamEditor.tsx'
import {paramNameSuggestions} from '../paramNameSuggestions.ts'

interface ProviderInspectorProps {
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  index: number
  /** Feld, das in den Blick gerückt und fokussiert werden soll (name, className, description, negation, params). */
  jumpField: string | null
  onDeleted: () => void
  /** Wird gemeldet, sobald der Feldsprung ausgeführt wurde. */
  onJumpDone: () => void
  onOpenRight: (index: number) => void
  policy: PolicyFile
  provider: ProviderDef
}

interface BlockProps {
  children: React.ReactNode
  field: string
  label: string
}

/** Beschriftete Zeile des Inspektors, als Sprungziel über `data-field` auffindbar. */
function Block({children, field, label}: BlockProps): React.JSX.Element {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-1 gap-1 border-t border-line py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-3"
      data-field={field}
    >
      <h3 className="pt-1 text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** Begründung für das gesperrte Löschen („von 1 Recht“ / „von n Rechten“). */
function usedReason(args: {count: number}): string {
  return `Wird noch von ${args.count} ${args.count === 1 ? 'Recht' : 'Rechten'} verwendet`
}

/** Rechte Spalte der Provider-Ansicht: Satzbeschreibung, Felder, Parameter, Verwendung und Löschen. */
export function ProviderInspector({
  dispatch,
  findings,
  index,
  jumpField,
  onDeleted,
  onJumpDone,
  onOpenRight,
  policy,
  provider,
}: ProviderInspectorProps): React.JSX.Element {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const prefix = `providers[${index}]`
  const own = findingsAt({findings, prefix})
  /** Befunde, die genau am Feld oder darunter liegen. */
  const at = (field: string): Finding[] =>
    own.filter(
      (f) =>
        f.path === `${prefix}.${field}` ||
        f.path.startsWith(`${prefix}.${field}[`) ||
        f.path.startsWith(`${prefix}.${field}.`),
    )
  const known = ['name', 'className', 'description', 'negation', 'params']
  const general = own.filter((f) => !known.some((field) => at(field).includes(f)))
  const usages = findProviderUsages({name: provider.name, policy})
  const used = usages.length > 0

  /* Feldsprung: Block in den Blick holen und das erste bedienbare Element fokussieren */
  useEffect(() => {
    if (jumpField === null) {
      return
    }
    const block = rootRef.current?.querySelector<HTMLElement>(`[data-field="${jumpField}"]`)
    block?.scrollIntoView({block: 'nearest'})
    block?.querySelector<HTMLElement>('button, input, select, a[href]')?.focus()
    onJumpDone()
  }, [jumpField, onJumpDone])

  /** Ändert den Provider anhand seines aktuellen Stands (nicht des gerenderten). */
  function update(args: {change: (p: ProviderDef) => ProviderDef; coalesce?: string}): void {
    dispatch({
      apply: (p) => {
        const current = p.providers[index]
        return current === undefined ? p : upsertProvider({index, policy: p, provider: args.change(current)})
      },
      coalesce: args.coalesce,
      type: 'edit',
    })
  }

  /** Benennt um (zieht Referenzen nach); eine abgelehnte Operation liefert ihre Meldung an das Feld zurück. */
  function rename(to: string): string | null {
    const message = rejection({run: () => renameProviderAt({index, policy, to})})
    if (message !== null) {
      return message
    }
    dispatch({apply: (p) => renameProviderAt({index, policy: p, to}), type: 'edit'})
    return null
  }

  return (
    <div className="min-w-0" ref={rootRef}>
      <div className="flex items-start gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="sr-only break-words">{provider.name}</h2>
          <div data-field="name">
            <InlineEdit ariaLabel="Name" mono onCommit={rename} size="lg" value={provider.name} />
          </div>
          <FieldFindings findings={at('name')} />
          <p className="mt-1 break-words text-muted">{describeProvider({provider}).sentence}</p>
          <FieldFindings findings={general} />
        </div>
        <ActionMenu
          items={[
            {
              danger: true,
              describedBy: used ? `provider-${index}-reason` : undefined,
              disabled: used,
              label: 'Löschen…',
              onSelect: () => setDeleteOpen(true),
            },
          ]}
          label="Aktionen für Provider"
        />
      </div>
      {used && (
        <p className="pb-2 text-muted" id={`provider-${index}-reason`}>
          {usedReason({count: usages.length})}
        </p>
      )}

      <Block field="className" label="Klasse">
        <select
          aria-label="Klasse"
          className="min-h-6 max-w-full rounded border border-line-strong bg-canvas px-2 font-mono text-fg outline-accent focus-visible:outline-2"
          onChange={(event) => {
            const className = event.target.value
            update({change: (p) => ({...p, className})})
          }}
          value={provider.className}
        >
          {!PROVIDER_CLASSES.includes(provider.className) && (
            <option value={provider.className}>{provider.className} (unbekannt)</option>
          )}
          {PROVIDER_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FieldFindings findings={at('className')} />
      </Block>

      <Block field="description" label="Beschreibung">
        <InlineEdit
          ariaLabel="Beschreibung"
          onCommit={(text) => {
            update({
              change: (p) => {
                const {description: _old, ...rest} = p
                return text.length === 0 ? rest : {...rest, description: text}
              },
              coalesce: `provider-${index}-description`,
            })
            return null
          }}
          placeholder="Beschreibung hinzufügen"
          value={provider.description ?? ''}
        />
        <FieldFindings findings={at('description')} />
      </Block>

      <Block field="negation" label="Negation">
        <div className="flex items-center gap-2">
          <button
            aria-checked={provider.negation === true}
            aria-describedby={`provider-${index}-negation-hint`}
            aria-label="Negation"
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-line-strong outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${provider.negation === true ? 'bg-accent' : 'bg-sidebar'}`}
            onClick={() => {
              update({change: (p) => ({...p, negation: p.negation !== true})})
            }}
            role="switch"
            type="button"
          >
            <span
              aria-hidden="true"
              className={`size-4 rounded-full ${provider.negation === true ? 'translate-x-5 bg-on-accent' : 'translate-x-1 bg-line-strong'}`}
            />
          </button>
          <span className="text-muted" id={`provider-${index}-negation-hint`}>
            Ergebnis des Providers umkehren
          </span>
        </div>
        <FieldFindings findings={at('negation')} />
      </Block>

      <Block field="params" label="Parameter">
        <ParamEditor
          idPrefix={`provider-${index}`}
          onChange={(params) => {
            update({
              change: (p) => {
                const {params: _old, ...rest} = p
                return params === undefined ? rest : {...rest, params}
              },
            })
          }}
          params={provider.params ?? []}
          suggestions={paramNameSuggestions({className: provider.className, excludeProvider: index, policy})}
        />
        <FieldFindings findings={at('params')} />
      </Block>

      <Block field="usages" label="Verwendet von">
        {used ? (
          <ul aria-label="Verwendet von" className="flex flex-col">
            {usages.map((rightIndex) => (
              <li key={rightIndex}>
                <button
                  className="min-h-6 max-w-full rounded px-1 text-left font-mono break-words text-accent outline-accent hover:bg-accent-soft focus-visible:outline-2"
                  onClick={() => onOpenRight(rightIndex)}
                  type="button"
                >
                  #{rightIndex + 1} {policy.rights[rightIndex]?.name ?? ''}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Wird von keinem Recht verwendet.</p>
        )}
      </Block>

      <ConfirmDialog
        confirmLabel="Löschen"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          dispatch({apply: (p) => deleteProvider({index, policy: p}), type: 'edit'})
          onDeleted()
        }}
        open={deleteOpen}
        title="Provider löschen"
      >
        Provider {provider.name} löschen?
      </ConfirmDialog>
    </div>
  )
}
