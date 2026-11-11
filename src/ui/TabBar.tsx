import type {TabId} from './Selection.ts'

interface TabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

const TABS: readonly {id: TabId; label: string}[] = [
  {id: 'channels', label: 'Channels'},
  {id: 'providers', label: 'Provider'},
  {id: 'rights', label: 'Rechte'},
  {id: 'matrix', label: 'Übersicht'},
]

/** Tab-Leiste (WAI-ARIA-Tabs): Pfeiltasten wechseln, Home/Ende springen an Anfang/Ende. */
export function TabBar({active, onChange}: TabBarProps): React.JSX.Element {
  /** Tastaturbedienung der Tab-Leiste. */
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    const last = TABS.length - 1
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index + last) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) {
      return
    }
    event.preventDefault()
    const tab = TABS[next]
    if (tab !== undefined) {
      onChange(tab.id)
      document.getElementById(`tab-${tab.id}`)?.focus()
    }
  }

  return (
    <div aria-label="Bereiche" className="flex gap-1 border-b border-slate-300 bg-white px-4" role="tablist">
      {TABS.map((tab, i) => {
        const selected = tab.id === active
        return (
          <button
            aria-controls={`panel-${tab.id}`}
            aria-selected={selected}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-700 ${
              selected
                ? 'border-indigo-700 text-indigo-900'
                : 'border-transparent text-slate-700 hover:border-slate-400 hover:text-slate-900'
            }`}
            id={`tab-${tab.id}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, i)}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
