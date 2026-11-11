import {useEffect, useState} from 'react'
import type {EditorAction} from '../state/editorReducer.ts'
import {addChannel, deleteChannel, findChannelUsages, renameChannel} from '../model/operations.ts'
import type {PolicyFile} from '../model/PolicyTypes.ts'
import {NameInput} from './NameInput.tsx'
import {BUTTON, BUTTON_DANGER, BUTTON_PRIMARY, INPUT} from './styles.ts'
import {UsageList} from './UsageList.tsx'
import {usageNames} from './usageNames.ts'

interface ChannelsTabProps {
  dispatch: (action: EditorAction) => void
  policy: PolicyFile
  selected: number | null
}

/** Channel-Tab: Liste mit Nutzungszähler, Umbenennen, Löschen (gesperrt bei Nutzung) und Hinzufügen. */
export function ChannelsTab({dispatch, policy, selected}: ChannelsTabProps): React.JSX.Element {
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (selected !== null) {
      document.getElementById(`channel-${selected}`)?.scrollIntoView({block: 'nearest'})
    }
  }, [selected])

  /** Legt den eingegebenen Channel an; das Feld wird nur bei Erfolg geleert. */
  function add(): void {
    const channel = newName.trim()
    dispatch({apply: (p) => addChannel({channel, policy: p}), type: 'edit'})
    if (channel.length > 0 && !policy.channels.includes(channel)) {
      setNewName('')
    }
  }

  return (
    <section aria-labelledby="channels-title" className="flex max-w-3xl flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900" id="channels-title">
        Channels ({policy.channels.length})
      </h2>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-900" htmlFor="channel-new">
            Neuer Channel
          </label>
          <input
            className={`${INPUT} font-mono`}
            id="channel-new"
            onChange={(event) => setNewName(event.target.value)}
            type="text"
            value={newName}
          />
        </div>
        <button className={BUTTON_PRIMARY} type="submit">
          Hinzufügen
        </button>
      </form>
      {policy.channels.length === 0 ? (
        <p className="text-sm text-slate-700">Noch keine Channels. Mindestens einer ist erforderlich.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {policy.channels.map((channel, index) => {
            const usages = findChannelUsages({channel, policy})
            const names = usageNames({indices: usages, policy})
            const reasonId = `channel-${index}-reason`
            return (
              <li
                className={`flex flex-wrap items-start gap-3 rounded-md border bg-white p-2 ${
                  selected === index ? 'border-indigo-700 ring-2 ring-indigo-700' : 'border-slate-300'
                }`}
                id={`channel-${index}`}
                key={index}
              >
                <NameInput
                  label={`Channel ${channel} umbenennen`}
                  onCommit={(to) =>
                    dispatch({apply: (p) => renameChannel({from: channel, policy: p, to}), type: 'edit'})
                  }
                  value={channel}
                />
                <div className="min-w-40 flex-1">
                  <UsageList names={names} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    aria-describedby={usages.length > 0 ? reasonId : undefined}
                    aria-label={`Channel ${channel} löschen`}
                    className={usages.length > 0 ? BUTTON : BUTTON_DANGER}
                    disabled={usages.length > 0}
                    onClick={() => dispatch({apply: (p) => deleteChannel({channel, policy: p}), type: 'edit'})}
                    title={usages.length > 0 ? `Gesperrt, verwendet von: ${names.join(', ')}` : undefined}
                    type="button"
                  >
                    Löschen
                  </button>
                  {usages.length > 0 && (
                    <span className="text-xs text-slate-700" id={reasonId}>
                      Gesperrt: noch in {usages.length} {usages.length === 1 ? 'Recht' : 'Rechten'} verwendet
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
