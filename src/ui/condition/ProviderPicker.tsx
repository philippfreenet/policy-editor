import {Combobox, ComboboxInput, ComboboxOption, ComboboxOptions} from '@headlessui/react'
import {useState} from 'react'
import type {ProviderDef} from '../../model/PolicyTypes.ts'

interface ProviderPickerProps {
  /** Zugänglicher Name des Suchfelds. */
  label: string
  onPick: (name: string) => void
  providers: readonly ProviderDef[]
}

/** Prüft, ob Name oder Beschreibung des Providers die Suche (ohne Beachtung der Groß-/Kleinschreibung) enthalten. */
function matches(args: {provider: ProviderDef; query: string}): boolean {
  const needle = args.query.trim().toLowerCase()
  return (
    needle.length === 0 ||
    args.provider.name.toLowerCase().includes(needle) ||
    (args.provider.description ?? '').toLowerCase().includes(needle)
  )
}

/** Suchfeld zum Hinzufügen eines Providers; durchsucht Name und Beschreibung und leert sich nach der Auswahl. */
export function ProviderPicker({label, onPick, providers}: ProviderPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const filtered = providers.filter((provider) => matches({provider, query}))
  return (
    <Combobox
      immediate
      onChange={(name: string | null) => {
        if (name !== null) {
          onPick(name)
        }
        setQuery('')
      }}
      value={null}
    >
      <div className="relative min-w-0">
        <ComboboxInput
          aria-label={label}
          autoComplete="off"
          className="min-h-6 w-full rounded border border-line-strong bg-surface px-2 py-1 outline-accent focus-visible:outline-2"
          displayValue={() => query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={`${label} …`}
        />
        {providers.length === 0 && <p className="px-2 py-1 text-muted">Noch keine Provider angelegt</p>}
        {providers.length > 0 && filtered.length === 0 && query.trim().length > 0 && (
          <p className="px-2 py-1 text-muted">Kein Provider gefunden</p>
        )}
        <ComboboxOptions className="absolute z-30 mt-1 max-h-64 w-full min-w-64 overflow-auto rounded border border-line-strong bg-surface py-1 outline-none empty:hidden">
          {filtered.map((provider, index) => (
            <ComboboxOption
              className="block cursor-pointer px-3 py-1 data-focus:bg-sidebar data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-accent"
              key={index}
              value={provider.name}
            >
              <span className="block font-mono break-words">{provider.name}</span>
              {provider.description !== undefined && provider.description.length > 0 && (
                <span className="block text-muted break-words">{provider.description}</span>
              )}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
