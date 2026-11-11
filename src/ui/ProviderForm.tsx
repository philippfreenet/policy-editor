import {PROVIDER_CLASSES} from '../constants.ts'
import {deleteProvider, findProviderUsages, renameProvider, upsertProvider} from '../model/operations.ts'
import type {PolicyFile, ProviderDef} from '../model/PolicyTypes.ts'
import type {EditorAction} from '../state/editorReducer.ts'
import {NameInput} from './NameInput.tsx'
import {ParamEditor} from './ParamEditor.tsx'
import {paramNameSuggestions} from './paramNameSuggestions.ts'
import {BUTTON, BUTTON_DANGER, INPUT} from './styles.ts'
import {UsageList} from './UsageList.tsx'
import {usageNames} from './usageNames.ts'

interface ProviderFormProps {
  dispatch: (action: EditorAction) => void
  index: number
  onDeleted: () => void
  policy: PolicyFile
  provider: ProviderDef
}

/** Formular für einen Provider; Namensänderungen laufen über renameProvider, alle anderen Felder über upsertProvider. */
export function ProviderForm({dispatch, index, onDeleted, policy, provider}: ProviderFormProps): React.JSX.Element {
  const prefix = `provider-form-${index}`
  const usages = findProviderUsages({name: provider.name, policy})
  const names = usageNames({indices: usages, policy})

  /** Schreibt den geänderten Provider zurück. */
  function save(next: ProviderDef): void {
    dispatch({apply: (p) => upsertProvider({index, policy: p, provider: next}), type: 'edit'})
  }

  /** Ändert die Beschreibung; leer bedeutet: Schlüssel weglassen. */
  function setDescription(text: string): void {
    const {description: _old, ...rest} = provider
    save(text.length === 0 ? rest : {...rest, description: text})
  }

  /** Ersetzt die Parameter; undefined lässt den Schlüssel weg. */
  function setParams(params: ProviderDef['params']): void {
    const {params: _old, ...rest} = provider
    save(params === undefined ? rest : {...rest, params})
  }

  return (
    <section
      aria-labelledby={`${prefix}-title`}
      className="flex flex-col gap-4 rounded-md border border-slate-300 bg-white p-4"
    >
      <h3 className="text-base font-semibold text-slate-900" id={`${prefix}-title`}>
        Provider {provider.name}
      </h3>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900" htmlFor={`${prefix}-name`}>
          Name
        </label>
        <NameInput
          id={`${prefix}-name`}
          label="Name"
          onCommit={(to) =>
            dispatch({apply: (p) => renameProvider({from: provider.name, policy: p, to}), type: 'edit'})
          }
          value={provider.name}
        />
        <p className="text-xs text-slate-700">Übernahme mit Enter oder beim Verlassen des Feldes; Escape verwirft.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900" htmlFor={`${prefix}-class`}>
          Klasse
        </label>
        <select
          className={INPUT}
          id={`${prefix}-class`}
          onChange={(event) => save({...provider, className: event.target.value})}
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
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900" htmlFor={`${prefix}-description`}>
          Beschreibung
        </label>
        <input
          className={INPUT}
          id={`${prefix}-description`}
          onChange={(event) => setDescription(event.target.value)}
          type="text"
          value={provider.description ?? ''}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <input
          checked={provider.negation === true}
          className="h-4 w-4"
          onChange={(event) => save({...provider, negation: event.target.checked})}
          type="checkbox"
        />
        Negation (Ergebnis des Providers umkehren)
      </label>
      <ParamEditor
        idPrefix={prefix}
        onChange={setParams}
        params={provider.params ?? []}
        suggestions={paramNameSuggestions({className: provider.className, excludeProvider: index, policy})}
      />
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-medium text-slate-900">Verwendet von</h4>
        <UsageList names={names} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-describedby={usages.length > 0 ? `${prefix}-reason` : undefined}
          className={usages.length > 0 ? BUTTON : BUTTON_DANGER}
          disabled={usages.length > 0}
          onClick={() => {
            dispatch({apply: (p) => deleteProvider({index, policy: p}), type: 'edit'})
            onDeleted()
          }}
          title={usages.length > 0 ? `Gesperrt, verwendet von: ${names.join(', ')}` : undefined}
          type="button"
        >
          Provider löschen
        </button>
        {usages.length > 0 && (
          <span className="text-xs text-slate-700" id={`${prefix}-reason`}>
            Gesperrt: noch in {usages.length} {usages.length === 1 ? 'Recht' : 'Rechten'} verwendet
          </span>
        )}
      </div>
    </section>
  )
}
