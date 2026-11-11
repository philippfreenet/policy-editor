import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react'
import {useState} from 'react'

interface ChipSelectProps {
  label: string
  onChange: (next: string[]) => void
  options: readonly string[]
  /** Zeigt ein Suchfeld über der Liste. */
  searchable?: boolean
  selected: readonly string[]
  /** Zeigt die Knöpfe „alle“ und „keine“. */
  showAllNone?: boolean
}

const SMALL_BUTTON =
  'min-h-6 rounded border border-line-strong px-2 outline-accent hover:bg-sidebar focus-visible:outline-2'

/** Auswahl mehrerer Werte als Checkliste im Popover; neue Werte werden hinten angefügt. */
export function ChipSelect({
  label,
  onChange,
  options,
  searchable = false,
  selected,
  showAllNone = false,
}: ChipSelectProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = options.filter((option) => option.toLowerCase().includes(needle))

  /** Wählt einen Wert an (hinten anfügen) oder ab. */
  function toggle(args: {option: string}): void {
    onChange(selected.includes(args.option) ? selected.filter((s) => s !== args.option) : [...selected, args.option])
  }

  return (
    <Popover className="relative inline-block">
      <PopoverButton
        className="inline-flex min-h-6 items-center gap-1 rounded border border-line-strong px-2 outline-accent hover:bg-sidebar focus-visible:outline-2"
        onClick={() => {
          setQuery('')
        }}
      >
        {label} <span aria-hidden="true">▾</span>
      </PopoverButton>
      <PopoverPanel className="absolute left-0 z-30 mt-1 w-56 rounded border border-line-strong bg-surface p-2" focus>
        {searchable && (
          <input
            aria-label={`${label} suchen`}
            className="mb-2 min-h-6 w-full rounded border border-line-strong bg-canvas px-2 outline-accent focus-visible:outline-2"
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            type="search"
            value={query}
          />
        )}
        {showAllNone && (
          <div className="mb-2 flex gap-2">
            <button
              className={SMALL_BUTTON}
              onClick={() => {
                onChange([...options])
              }}
              type="button"
            >
              alle
            </button>
            <button
              className={SMALL_BUTTON}
              onClick={() => {
                onChange([])
              }}
              type="button"
            >
              keine
            </button>
          </div>
        )}
        <ul className="max-h-60 overflow-auto">
          {visible.map((option) => (
            <li key={option}>
              <label className="flex min-h-6 cursor-pointer items-center gap-2 break-words">
                <input
                  checked={selected.includes(option)}
                  className="size-4 accent-accent outline-accent focus-visible:outline-2"
                  onChange={() => {
                    toggle({option})
                  }}
                  type="checkbox"
                  value={option}
                />
                <span className="min-w-0 break-words">{option}</span>
              </label>
            </li>
          ))}
        </ul>
      </PopoverPanel>
    </Popover>
  )
}
