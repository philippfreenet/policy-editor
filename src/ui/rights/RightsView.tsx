import {useCallback, useEffect, useState} from 'react'
import {upsertRight} from '../../model/operations.ts'
import {matchesFilter} from '../../model/rightQueries.ts'
import type {RightFilter} from '../../model/rightQueries.ts'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {parseSearch} from '../logic/parseSearch.ts'
import {uniqueName} from '../uniqueName.ts'
import {useEntrySelection} from '../useEntrySelection.ts'
import type {EntryJump, EntryStore} from '../useEntrySelection.ts'
import {RightInspector} from './RightInspector.tsx'
import {RightList} from './RightList.tsx'
import type {FilterKey} from './RightList.tsx'

interface RightsViewProps {
  /** Indizes der gegenüber der geladenen Datei geänderten Rechte. */
  changed: ReadonlySet<number>
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  policy: PolicyFile
  selection: EntryJump | null
  /** Ablage, in der Auswahl, Suche und Filter den Wechsel der Ansicht überstehen. */
  store?: EntryStore
}

type MenuFilter = Record<FilterKey, string | null>

const NO_MENU: MenuFilter = {channel: null, provider: null, role: null}
const SEARCH_KEY: Record<FilterKey, string> = {channel: 'channel', provider: 'provider', role: 'rolle'}

/** Rechte-Ansicht: Liste mit Suche und Filtern links, Inspektor des gewählten Rechts rechts. */
export function RightsView({
  changed,
  dispatch,
  findings,
  policy,
  selection,
  store,
}: RightsViewProps): React.JSX.Element {
  const {
    clearJump,
    filters: menu,
    jumpField,
    open,
    select,
    setFilters: setMenu,
    setText,
    text,
  } = useEntrySelection<MenuFilter>({
    emptyFilters: NO_MENU,
    items: policy.rights,
    jump: selection,
    store,
    storeKey: 'rights',
  })
  const [focusList, setFocusList] = useState(false)
  const [editNameFor, setEditNameFor] = useState<number | null>(null)

  const parsed = parseSearch({text})
  const filter: RightFilter = {
    channel: menu.channel ?? parsed.channel,
    provider: menu.provider ?? parsed.provider,
    query: parsed.query,
    role: menu.role ?? parsed.role,
  }
  const visible = policy.rights.flatMap((right, index) => (matchesFilter({filter, right}) ? [index] : []))
  const openRight = open === null ? undefined : policy.rights[open]

  /** Verbraucht den Namensfeld-Start. */
  const clearAutoEdit = useCallback((): void => setEditNameFor(null), [])

  /* Nach dem Löschen landet der Fokus in der Liste statt im Nichts */
  useEffect(() => {
    if (focusList) {
      document.getElementById('rights-list')?.focus()
      setFocusList(false)
    }
  }, [focusList])

  /** Hängt ein neues Recht an, wählt es und öffnet sein Namensfeld. */
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
    setText('')
    setMenu(() => NO_MENU)
    select(policy.rights.length)
    setEditNameFor(policy.rights.length)
  }

  /** Entfernt einen Filter aus Menü und Suchtext. */
  function removeFilter(args: {key: FilterKey}): void {
    const pattern = new RegExp(`^${SEARCH_KEY[args.key]}:.+$`, 'i')
    setMenu((m) => ({...m, [args.key]: null}))
    setText((t) =>
      t
        .split(/\s+/)
        .filter((token) => token.length > 0 && !pattern.test(token))
        .join(' '),
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
      <RightList
        changed={changed}
        filter={filter}
        findings={findings}
        onCreate={create}
        onFilterChange={({key, value}) => setMenu((m) => ({...m, [key]: value}))}
        onFilterRemove={removeFilter}
        onResetFilter={() => {
          setText('')
          setMenu(() => NO_MENU)
        }}
        onSearchChange={setText}
        onSelect={select}
        policy={policy}
        searchText={text}
        selected={openRight === undefined ? null : open}
        visible={visible}
      />
      <div className="min-w-0" id="right-inspector">
        {openRight === undefined || open === null ? (
          <p className="text-muted">Recht aus der Liste wählen oder ein neues anlegen.</p>
        ) : (
          <RightInspector
            autoEditName={editNameFor === open}
            dispatch={dispatch}
            findings={findings}
            index={open}
            key={open}
            onAutoEditDone={clearAutoEdit}
            jumpField={jumpField}
            onDeleted={() => {
              select(null)
              setFocusList(true)
            }}
            onJumpDone={clearJump}
            onMoved={select}
            policy={policy}
            right={openRight}
          />
        )}
      </div>
    </div>
  )
}
