import {useEffect, useState} from 'react'
import {upsertRight} from '../model/operations.ts'
import type {PolicyFile} from '../model/PolicyTypes.ts'
import type {EditorAction} from '../state/editorReducer.ts'
import {RightForm} from './RightForm.tsx'
import {BUTTON_PRIMARY, INPUT} from './styles.ts'
import {uniqueName} from './uniqueName.ts'

interface RightsTabProps {
  dispatch: (action: EditorAction) => void
  policy: PolicyFile
  selected: number | null
}

/** Rechte-Tab: durchsuchbare Liste mit öffentlicher ID; die Auswahl öffnet das Formular. */
export function RightsTab({dispatch, policy, selected}: RightsTabProps): React.JSX.Element {
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
      document.getElementById(`right-item-${open}`)?.scrollIntoView({block: 'nearest'})
      /* Im gestapelten Layout (schmal) liegt das Formular unter der Liste und wird ins Bild geholt */
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        document.getElementById('right-form-panel')?.scrollIntoView({block: 'nearest'})
      }
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const visible = policy.rights
    .map((right, index) => ({index, right}))
    .filter(
      ({right}) => needle.length === 0 || [right.name, right.description].some((t) => t.toLowerCase().includes(needle)),
    )
  const openRight = open === null ? undefined : policy.rights[open]

  /** Hängt ein neues, statisches Recht an und öffnet es. */
  function create(): void {
    const name = uniqueName({base: 'NeuesRecht', taken: policy.rights.map((r) => r.name)})
    dispatch({
      apply: (p) =>
        upsertRight({
          index: null,
          policy: p,
          right: {channels: [], condition: undefined, description: '', name, roles: []},
        }),
      type: 'edit',
    })
    setQuery('')
    setOpen(policy.rights.length)
  }

  return (
    <section aria-labelledby="rights-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-lg font-semibold text-slate-900" id="rights-title">
          Rechte ({policy.rights.length})
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-900" htmlFor="right-search">
            Suche
          </label>
          <input
            className={INPUT}
            id="right-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Beschreibung"
            type="search"
            value={query}
          />
        </div>
        <button className={BUTTON_PRIMARY} onClick={create} type="button">
          Neues Recht
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p aria-live="polite" className="mb-2 text-xs text-slate-700">
            {visible.length} von {policy.rights.length} angezeigt
          </p>
          <ul className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-13rem)]">
            {visible.map(({index, right}) => (
              <li id={`right-item-${index}`} key={index}>
                <button
                  aria-current={open === index}
                  className={`flex w-full flex-col rounded-md border px-3 py-2 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
                    open === index
                      ? 'border-indigo-700 bg-indigo-50 ring-1 ring-indigo-700'
                      : 'border-slate-300 bg-white'
                  }`}
                  onClick={() => setOpen(index)}
                  title={`#${index + 1} ${right.name}`}
                  type="button"
                >
                  <span className="break-words font-mono text-sm font-medium text-slate-900">
                    #{index + 1} {right.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p className="text-sm text-slate-700">Keine Treffer.</p>}
        </div>
        <div className="min-w-0" id="right-form-panel">
          {openRight === undefined ? (
            <p className="text-sm text-slate-700">Recht aus der Liste wählen oder ein neues anlegen.</p>
          ) : (
            <RightForm
              dispatch={dispatch}
              index={open as number}
              key={open}
              onDeleted={() => setOpen(null)}
              onMoved={setOpen}
              policy={policy}
              right={openRight}
            />
          )}
        </div>
      </div>
    </section>
  )
}
