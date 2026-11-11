import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/react'
import {USER_ROLES} from '../../constants.ts'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import type {RightFilter} from '../../model/rightQueries.ts'
import {Chip} from '../kit/Chip.tsx'
import {findingsAt} from '../logic/findingsAt.ts'
import {summarizeRight} from '../logic/summarizeRight.ts'

/** Dimension eines Filters. */
export type FilterKey = 'channel' | 'provider' | 'role'

const FILTER_LABEL: Record<FilterKey, string> = {channel: 'Channel', provider: 'Provider', role: 'Rolle'}
const FILTER_KEYS: readonly FilterKey[] = ['role', 'channel', 'provider']
const BUTTON =
  'min-h-6 rounded border border-line-strong bg-surface px-2 py-0.5 outline-accent hover:bg-sidebar focus-visible:outline-2'

interface FilterMenuProps {
  filterKey: FilterKey
  onChange: (value: string | null) => void
  options: readonly string[]
  value: string | null
}

/** Einwertige Filterauswahl (Listbox); „alle“ hebt den Filter auf. */
function FilterMenu({filterKey, onChange, options, value}: FilterMenuProps): React.JSX.Element {
  return (
    <Listbox
      onChange={(next: string) => {
        onChange(next === '' ? null : next)
      }}
      value={value ?? ''}
    >
      <div className="relative">
        <ListboxButton className={BUTTON}>
          {FILTER_LABEL[filterKey]} <span aria-hidden="true">▾</span>
        </ListboxButton>
        <ListboxOptions className="absolute left-0 z-30 mt-1 max-h-60 min-w-40 overflow-auto rounded border border-line-strong bg-surface py-1 outline-none">
          {['', ...options].map((option) => (
            <ListboxOption
              className="min-h-6 cursor-pointer px-3 py-1 break-words data-focus:bg-sidebar data-selected:font-semibold"
              key={option}
              value={option}
            >
              {option === '' ? 'alle' : option}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}

interface RightListProps {
  changed: ReadonlySet<number>
  /** Wirksamer Filter (Suchtext und Menüwerte zusammengeführt). */
  filter: RightFilter
  findings: readonly Finding[]
  onCreate: () => void
  onFilterChange: (args: {key: FilterKey; value: string | null}) => void
  onFilterRemove: (args: {key: FilterKey}) => void
  onResetFilter: () => void
  onSearchChange: (text: string) => void
  onSelect: (index: number) => void
  policy: PolicyFile
  searchText: string
  selected: number | null
  /** Indizes der Rechte, die dem Filter entsprechen. */
  visible: readonly number[]
}

/** Linke Spalte der Rechte-Ansicht: Suche, Filter, Zähler und die Liste der Rechte. */
export function RightList({
  changed,
  filter,
  findings,
  onCreate,
  onFilterChange,
  onFilterRemove,
  onResetFilter,
  onSearchChange,
  onSelect,
  policy,
  searchText,
  selected,
  visible,
}: RightListProps): React.JSX.Element {
  const providerNames = [...new Set(policy.providers.map((p) => p.name))].sort((a, b) => a.localeCompare(b))
  const options: Record<FilterKey, readonly string[]> = {
    channel: [...new Set(policy.channels)],
    provider: providerNames,
    role: USER_ROLES,
  }
  const active = FILTER_KEYS.filter((key) => filter[key] !== null)
  const total = policy.rights.length

  return (
    <div className="flex min-w-0 flex-col gap-2 border-line lg:sticky lg:top-0 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Rechte</h2>
        <button
          className="min-h-6 rounded bg-accent px-2 py-0.5 text-on-accent outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onCreate}
          type="button"
        >
          + Neues Recht
        </button>
      </div>
      <input
        aria-label="Rechte suchen"
        className="min-h-6 w-full rounded border border-line-strong bg-canvas px-2 outline-accent focus-visible:outline-2"
        onChange={(event) => {
          onSearchChange(event.target.value)
        }}
        placeholder="Suchen · rolle: channel: provider:"
        type="search"
        value={searchText}
      />
      <div className="flex flex-wrap items-center gap-1">
        {FILTER_KEYS.map((key) => (
          <FilterMenu
            filterKey={key}
            key={key}
            onChange={(value) => {
              onFilterChange({key, value})
            }}
            options={options[key]}
            value={filter[key]}
          />
        ))}
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {active.map((key) => (
            <Chip
              key={key}
              onRemove={() => {
                onFilterRemove({key})
              }}
              removeLabel={`Filter ${FILTER_LABEL[key]} entfernen`}
              tone="neutral"
            >
              {FILTER_LABEL[key]}: {filter[key]}
            </Chip>
          ))}
        </div>
      )}
      <p aria-live="polite" className="text-muted">
        {visible.length} von {total}
      </p>
      {total === 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted">Noch keine Rechte.</p>
          <button className={BUTTON} onClick={onCreate} type="button">
            Erstes Recht anlegen
          </button>
        </div>
      )}
      {total > 0 && visible.length === 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted">Keine Treffer.</p>
          <button className={BUTTON} onClick={onResetFilter} type="button">
            Filter zurücksetzen
          </button>
        </div>
      )}
      <ul
        aria-label="Rechte"
        className="flex flex-col divide-y divide-line border-y border-line outline-accent focus-visible:outline-2"
        id="rights-list"
        tabIndex={-1}
      >
        {visible.map((index) => {
          const right = policy.rights[index]
          if (right === undefined) {
            return null
          }
          const hasError = findingsAt({findings, prefix: `rights[${index}]`}).some((f) => f.severity === 'error')
          const isSelected = selected === index
          return (
            <li id={`right-item-${index}`} key={index}>
              <button
                aria-current={isSelected ? 'true' : undefined}
                className={`flex w-full min-w-0 flex-col gap-0.5 px-3 py-1.5 text-left outline-accent hover:bg-sidebar focus-visible:outline-2 focus-visible:-outline-offset-2 ${isSelected ? 'bg-accent-soft shadow-[inset_3px_0_0_0_var(--color-accent)]' : ''}`}
                onClick={() => {
                  onSelect(index)
                }}
                type="button"
              >
                <span className="flex min-w-0 items-start gap-1">
                  <span className="min-w-0 flex-1 font-mono font-medium break-words">
                    #{index + 1} {right.name}
                  </span>
                  {changed.has(index) && (
                    <span aria-label="geändert" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" role="img" />
                  )}
                  {hasError && (
                    <span aria-label="hat Fehler" className="shrink-0 font-bold text-danger" role="img">
                      !
                    </span>
                  )}
                </span>
                <span className="min-w-0 text-muted break-words">{summarizeRight({policy, right})}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
