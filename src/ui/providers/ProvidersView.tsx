import {useCallback, useEffect, useState} from 'react'
import {findProviderUsages, upsertProvider} from '../../model/operations.ts'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import {PROVIDER_CLASSES} from '../../constants.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {findingsAt} from '../logic/findingsAt.ts'
import {uniqueName} from '../uniqueName.ts'
import {ProviderInspector} from './ProviderInspector.tsx'

interface ProvidersViewProps {
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  onOpenRight: (index: number) => void
  policy: PolicyFile
  selection: {field: string | null; index: number | null} | null
}

/** Provider-Ansicht: durchsuchbare Liste links, Inspektor des gewählten Providers rechts. */
export function ProvidersView({
  dispatch,
  findings,
  onOpenRight,
  policy,
  selection,
}: ProvidersViewProps): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(selection?.index ?? null)
  /* Auswahl wird per Objektidentität verglichen: App erzeugt je Sprung ein neues Objekt, auch für denselben Eintrag */
  const [lastSelection, setLastSelection] = useState(selection)
  const [jumpField, setJumpField] = useState<string | null>(selection?.field ?? null)
  const [focusList, setFocusList] = useState(false)
  const [query, setQuery] = useState('')

  if (selection !== lastSelection) {
    setLastSelection(selection)
    if (selection?.index !== null && selection?.index !== undefined) {
      setOpen(selection.index)
      setJumpField(selection.field)
      setQuery('')
    }
  }

  /** Verbraucht den Feldsprung. */
  const clearJump = useCallback((): void => setJumpField(null), [])

  /* Nach dem Löschen landet der Fokus in der Liste statt im Nichts */
  useEffect(() => {
    if (focusList) {
      document.getElementById('providers-list')?.focus()
      setFocusList(false)
    }
  }, [focusList])

  /* Der gewählte Eintrag wird in der Liste sichtbar gehalten */
  useEffect(() => {
    if (open !== null) {
      document.getElementById(`provider-item-${open}`)?.scrollIntoView({block: 'nearest'})
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const visible = policy.providers.flatMap((provider, index) =>
    needle.length === 0 || [provider.name, provider.description ?? ''].some((t) => t.toLowerCase().includes(needle))
      ? [{index, provider}]
      : [],
  )
  const openProvider = open === null ? undefined : policy.providers[open]
  const total = policy.providers.length

  /** Hängt einen neuen Provider an und wählt ihn. */
  function create(): void {
    const name = uniqueName({base: 'NeuerProvider', taken: policy.providers.map((p) => p.name)})
    dispatch({
      apply: (p) =>
        upsertProvider({
          index: null,
          policy: p,
          provider: {className: PROVIDER_CLASSES[0] ?? '', name, negation: false},
        }),
      type: 'edit',
    })
    setQuery('')
    setOpen(total)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Provider</h2>
          <button
            className="min-h-6 rounded bg-accent px-2 py-0.5 text-on-accent outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={create}
            type="button"
          >
            + Neuer Provider
          </button>
        </div>
        <input
          aria-label="Provider suchen"
          className="min-h-6 w-full rounded border border-line-strong bg-canvas px-2 outline-accent focus-visible:outline-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name oder Beschreibung"
          type="search"
          value={query}
        />
        <p aria-live="polite" className="text-muted">
          {visible.length} von {total}
        </p>
        {total === 0 && <p className="text-muted">Noch keine Provider.</p>}
        {total > 0 && visible.length === 0 && <p className="text-muted">Keine Treffer.</p>}
        <ul
          aria-label="Provider"
          className="flex flex-col divide-y divide-line border-y border-line outline-accent focus-visible:outline-2"
          id="providers-list"
          tabIndex={-1}
        >
          {visible.map(({index, provider}) => {
            const count = findProviderUsages({name: provider.name, policy}).length
            const hasError = findingsAt({findings, prefix: `providers[${index}]`}).some((f) => f.severity === 'error')
            const isSelected = open === index
            return (
              <li id={`provider-item-${index}`} key={index}>
                <button
                  aria-current={isSelected ? 'true' : undefined}
                  className={`flex w-full min-w-0 flex-col gap-0.5 px-3 py-1.5 text-left outline-accent hover:bg-sidebar focus-visible:outline-2 focus-visible:-outline-offset-2 ${isSelected ? 'bg-accent-soft shadow-[inset_3px_0_0_0_var(--color-accent)]' : ''}`}
                  onClick={() => setOpen(index)}
                  type="button"
                >
                  <span className="flex min-w-0 items-start gap-1">
                    <span className="min-w-0 flex-1 font-mono font-medium break-words">{provider.name}</span>
                    {hasError && (
                      <span aria-label="hat Fehler" className="shrink-0 font-bold text-danger" role="img">
                        !
                      </span>
                    )}
                  </span>
                  {(provider.description ?? '') !== '' && (
                    <span className="min-w-0 text-muted break-words">{provider.description}</span>
                  )}
                  <span className="text-muted">
                    {count} {count === 1 ? 'Recht' : 'Rechte'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="min-w-0" id="provider-inspector">
        {openProvider === undefined || open === null ? (
          <p className="text-muted">Provider aus der Liste wählen oder einen neuen anlegen.</p>
        ) : (
          <ProviderInspector
            dispatch={dispatch}
            findings={findings}
            index={open}
            jumpField={jumpField}
            key={open}
            onDeleted={() => {
              setOpen(null)
              setFocusList(true)
            }}
            onJumpDone={clearJump}
            onOpenRight={onOpenRight}
            policy={policy}
            provider={openProvider}
          />
        )}
      </div>
    </div>
  )
}
