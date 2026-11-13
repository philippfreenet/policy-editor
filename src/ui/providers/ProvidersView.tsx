import {useEffect, useState} from 'react'
import {findProviderUsages, upsertProvider} from '../../model/operations.ts'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import {PROVIDER_CLASSES} from '../../constants.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {findingsAt} from '../logic/findingsAt.ts'
import {uniqueName} from '../uniqueName.ts'
import {useEntrySelection} from '../useEntrySelection.ts'
import type {EntryJump, EntryStore} from '../useEntrySelection.ts'
import {ProviderInspector} from './ProviderInspector.tsx'

const BUTTON =
  'min-h-6 rounded border border-line-strong bg-surface px-2 py-0.5 outline-accent hover:bg-sidebar focus-visible:outline-2'

interface ProvidersViewProps {
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  onOpenRight: (index: number) => void
  policy: PolicyFile
  selection: EntryJump | null
  /** Ablage, in der Auswahl und Suche den Wechsel der Ansicht überstehen. */
  store?: EntryStore
}

const NO_FILTERS = {}

/** Provider-Ansicht: durchsuchbare Liste links, Inspektor des gewählten Providers rechts. */
export function ProvidersView({
  dispatch,
  findings,
  onOpenRight,
  policy,
  selection,
  store,
}: ProvidersViewProps): React.JSX.Element {
  const {
    clearJump,
    jumpField,
    open,
    select,
    setText: setQuery,
    text: query,
  } = useEntrySelection({
    emptyFilters: NO_FILTERS,
    items: policy.providers,
    jump: selection,
    store,
    storeKey: 'providers',
  })
  const [focusList, setFocusList] = useState(false)

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
    select(total)
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
        {total === 0 && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted">Noch keine Provider.</p>
            <button className={BUTTON} onClick={create} type="button">
              Ersten Provider anlegen
            </button>
          </div>
        )}
        {total > 0 && visible.length === 0 && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted">Keine Treffer.</p>
            <button className={BUTTON} onClick={() => setQuery('')} type="button">
              Filter zurücksetzen
            </button>
          </div>
        )}
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
                  onClick={() => select(index)}
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
              select(null)
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
