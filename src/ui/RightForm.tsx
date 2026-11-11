import {USER_ROLES} from '../constants.ts'
import {formatCondition} from '../model/formatCondition.ts'
import {deleteRight, moveRight, upsertRight} from '../model/operations.ts'
import type {PolicyFile, RightDef} from '../model/PolicyTypes.ts'
import type {EditorAction} from '../state/editorReducer.ts'
import {ConditionTree} from './ConditionTree.tsx'
import {NameInput} from './NameInput.tsx'
import {BUTTON, BUTTON_DANGER, INPUT} from './styles.ts'

interface RightFormProps {
  dispatch: (action: EditorAction) => void
  index: number
  onDeleted: () => void
  onMoved: (to: number) => void
  policy: PolicyFile
  right: RightDef
}

const MOVE_CONFIRM = 'Die öffentlichen IDs der Rechte ändern sich. Fortfahren?'

/** Formular für ein Recht: Name, Beschreibung, Rollen, Channels und Bedingungsbaum. */
export function RightForm({dispatch, index, onDeleted, onMoved, policy, right}: RightFormProps): React.JSX.Element {
  const prefix = `right-form-${index}`
  const extraRoles = [...new Set(right.roles.filter((r) => !USER_ROLES.includes(r)))]
  const extraChannels = [...new Set(right.channels.filter((c) => !policy.channels.includes(c)))]

  /** Schreibt das geänderte Recht zurück. */
  function save(next: RightDef, coalesce?: string): void {
    dispatch({apply: (p) => upsertRight({index, policy: p, right: next}), coalesce, type: 'edit'})
  }

  /** Schaltet einen Eintrag einer Liste um; neue Einträge werden hinten angefügt. */
  function toggle(args: {list: string[]; value: string}): string[] {
    return args.list.includes(args.value) ? args.list.filter((v) => v !== args.value) : [...args.list, args.value]
  }

  /** Verschiebt das Recht nach Rückfrage und meldet die neue Position. */
  function move(to: number): void {
    if (!window.confirm(MOVE_CONFIRM)) {
      return
    }
    dispatch({apply: (p) => moveRight({from: index, policy: p, to}), type: 'edit'})
    onMoved(to)
  }

  /** Löscht das Recht nach Rückfrage. */
  function remove(): void {
    if (!window.confirm(`Recht ${right.name} wirklich löschen? Die IDs der folgenden Rechte ändern sich.`)) {
      return
    }
    dispatch({apply: (p) => deleteRight({index, policy: p}), type: 'edit'})
    onDeleted()
  }

  const isStatic = right.condition === undefined

  return (
    <section
      aria-labelledby={`${prefix}-title`}
      className="flex flex-col gap-4 rounded-md border border-slate-300 bg-white p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto min-w-0 break-words text-base font-semibold text-slate-900" id={`${prefix}-title`}>
          Recht #{index + 1} {right.name}
        </h3>
        <button
          aria-label={`Recht ${right.name} nach oben verschieben`}
          className={BUTTON}
          disabled={index === 0}
          onClick={() => move(index - 1)}
          type="button"
        >
          ↑
        </button>
        <button
          aria-label={`Recht ${right.name} nach unten verschieben`}
          className={BUTTON}
          disabled={index === policy.rights.length - 1}
          onClick={() => move(index + 1)}
          type="button"
        >
          ↓
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900" htmlFor={`${prefix}-name`}>
          Name
        </label>
        <NameInput id={`${prefix}-name`} label="Name" onCommit={(name) => save({...right, name})} value={right.name} />
        <p className="text-xs text-slate-700">Übernahme mit Enter oder beim Verlassen des Feldes; Escape verwirft.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900" htmlFor={`${prefix}-description`}>
          Beschreibung
        </label>
        <input
          className={INPUT}
          id={`${prefix}-description`}
          onChange={(event) => save({...right, description: event.target.value}, `right-${index}-description`)}
          type="text"
          value={right.description}
        />
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-slate-900">Rollen</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[...USER_ROLES, ...extraRoles].map((role) => (
            <label className="flex items-center gap-2 text-sm text-slate-900" key={role}>
              <input
                checked={right.roles.includes(role)}
                className="h-4 w-4"
                onChange={() => save({...right, roles: toggle({list: right.roles, value: role})})}
                type="checkbox"
              />
              <span className="font-mono">{role}</span>
              {!USER_ROLES.includes(role) && <span className="text-xs text-red-800">(unbekannt)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-slate-900">Channels</legend>
        <div className="flex gap-2">
          <button className={BUTTON} onClick={() => save({...right, channels: [...policy.channels]})} type="button">
            alle
          </button>
          <button className={BUTTON} onClick={() => save({...right, channels: []})} type="button">
            keine
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[...policy.channels, ...extraChannels].map((channel) => (
            <label className="flex items-center gap-2 text-sm text-slate-900" key={channel}>
              <input
                checked={right.channels.includes(channel)}
                className="h-4 w-4"
                onChange={() => save({...right, channels: toggle({list: right.channels, value: channel})})}
                type="checkbox"
              />
              <span className="font-mono">{channel}</span>
              {!policy.channels.includes(channel) && <span className="text-xs text-red-800">(unbekannt)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-slate-900">Bedingung</h4>
        <label className="flex items-center gap-2 text-sm text-slate-900">
          <input
            checked={isStatic}
            className="h-4 w-4"
            onChange={(event) => {
              const {condition: _old, ...rest} = right
              save(event.target.checked ? rest : {...rest, condition: {conditions: [], operator: 'AND'}})
            }}
            type="checkbox"
          />
          Statisch (ohne Bedingung)
        </label>
        {right.condition !== undefined && (
          <p className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm break-words text-slate-900">
            <span className="sr-only">Formel: </span>
            {right.condition.conditions.length === 0 ? (
              <span className="font-sans text-slate-700">Leere Bedingung – Provider oder Gruppe hinzufügen.</span>
            ) : (
              formatCondition({node: right.condition})
            )}
          </p>
        )}
        {right.condition !== undefined && (
          <ConditionTree
            onChange={(condition) => save({...right, condition})}
            providers={policy.providers}
            value={right.condition}
          />
        )}
      </div>
      <div>
        <button className={BUTTON_DANGER} onClick={remove} type="button">
          Recht löschen
        </button>
      </div>
    </section>
  )
}
