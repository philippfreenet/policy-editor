import {useEffect, useState} from 'react'
import {upsertProvider, findProviderUsages} from '../model/operations.ts'
import type {PolicyFile} from '../model/PolicyTypes.ts'
import type {EditorAction} from '../state/editorReducer.ts'
import {ProviderForm} from './ProviderForm.tsx'
import {BUTTON_PRIMARY, INPUT} from './styles.ts'
import {uniqueName} from './uniqueName.ts'

interface ProvidersTabProps {
  dispatch: (action: EditorAction) => void
  policy: PolicyFile
  selected: number | null
}

/** Provider-Tab: durchsuchbare Liste mit Nutzungszähler; die Auswahl öffnet das Formular. */
export function ProvidersTab({dispatch, policy, selected}: ProvidersTabProps): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(selected)
  const [query, setQuery] = useState('')
  const [lastSelected, setLastSelected] = useState(selected)
  if (lastSelected !== selected) {
    setLastSelected(selected)
    if (selected !== null) {
      setOpen(selected)
      setQuery('')
    }
  }

  useEffect(() => {
    if (open !== null) {
      document.getElementById(`provider-item-${open}`)?.scrollIntoView({block: 'nearest'})
      /* Im gestapelten Layout (schmal) liegt das Formular unter der Liste und wird ins Bild geholt */
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        document.getElementById('provider-form-panel')?.scrollIntoView({block: 'nearest'})
      }
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const visible = policy.providers
    .map((provider, index) => ({index, provider}))
    .filter(
      ({provider}) =>
        needle.length === 0 ||
        [provider.name, provider.className, provider.description ?? ''].some((t) => t.toLowerCase().includes(needle)),
    )
  const openProvider = open === null ? undefined : policy.providers[open]

  /** Hängt einen neuen Provider an und öffnet ihn. */
  function create(): void {
    const name = uniqueName({base: 'Neuer_Provider', taken: policy.providers.map((p) => p.name)})
    dispatch({
      apply: (p) =>
        upsertProvider({index: null, policy: p, provider: {className: 'ContractStateProvider', name, negation: false}}),
      type: 'edit',
    })
    setQuery('')
    setOpen(policy.providers.length)
  }

  return (
    <section aria-labelledby="providers-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-lg font-semibold text-slate-900" id="providers-title">
          Provider ({policy.providers.length})
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-900" htmlFor="provider-search">
            Suche
          </label>
          <input
            className={INPUT}
            id="provider-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Klasse, Beschreibung"
            type="search"
            value={query}
          />
        </div>
        <button className={BUTTON_PRIMARY} onClick={create} type="button">
          Neuer Provider
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p aria-live="polite" className="mb-2 text-xs text-slate-700">
            {visible.length} von {policy.providers.length} angezeigt
          </p>
          <ul className="flex max-h-[40vh] flex-col lg:max-h-[calc(100vh-13rem)] gap-1 overflow-y-auto">
            {visible.map(({index, provider}) => {
              const count = findProviderUsages({name: provider.name, policy}).length
              return (
                <li id={`provider-item-${index}`} key={index}>
                  <button
                    aria-current={open === index}
                    className={`flex w-full flex-col rounded-md border px-3 py-2 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
                      open === index
                        ? 'border-indigo-700 bg-indigo-50 ring-1 ring-indigo-700'
                        : 'border-slate-300 bg-white'
                    }`}
                    onClick={() => setOpen(index)}
                    type="button"
                  >
                    <span className="font-mono text-sm font-medium text-slate-900">{provider.name}</span>
                    <span className="text-xs text-slate-700">
                      {provider.className} · {count} {count === 1 ? 'Recht' : 'Rechte'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {visible.length === 0 && <p className="text-sm text-slate-700">Keine Treffer.</p>}
        </div>
        <div id="provider-form-panel" className="min-w-0">
          {openProvider === undefined ? (
            <p className="text-sm text-slate-700">Provider aus der Liste wählen oder einen neuen anlegen.</p>
          ) : (
            <ProviderForm
              dispatch={dispatch}
              index={open as number}
              key={open}
              onDeleted={() => setOpen(null)}
              policy={policy}
              provider={openProvider}
            />
          )}
        </div>
      </div>
    </section>
  )
}
