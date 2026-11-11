import {useEffect, useState} from 'react'
import {addChannel, deleteChannel, findChannelUsages, renameChannel} from '../../model/operations.ts'
import type {Finding, PolicyFile} from '../../model/PolicyTypes.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {FieldFindings} from '../FieldFindings.tsx'
import {InlineEdit} from '../kit/InlineEdit.tsx'
import {ConfirmDialog} from '../kit/ConfirmDialog.tsx'
import {findingsAt} from '../logic/findingsAt.ts'
import {rejection} from '../logic/rejection.ts'

interface ChannelsViewProps {
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  onOpenRight: (index: number) => void
  policy: PolicyFile
  selection: {field: string | null; index: number | null} | null
}

/** Channel-Ansicht: Hinzufügen, Umbenennen in der Zeile, Nutzungszähler mit Rechte-Liste, Löschen (gesperrt bei Nutzung). */
export function ChannelsView({
  dispatch,
  findings,
  onOpenRight,
  policy,
  selection,
}: ChannelsViewProps): React.JSX.Element {
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
  const [focusList, setFocusList] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  /* Eine von außen gesetzte Auswahl rückt die Zeile in den Blick und fokussiert ihr erstes Bedienelement */
  useEffect(() => {
    if (selection?.index !== null && selection?.index !== undefined) {
      const row = document.getElementById(`channel-${selection.index}`)
      row?.scrollIntoView({block: 'nearest'})
      row?.querySelector<HTMLElement>('button, input')?.focus()
    }
  }, [selection])

  /* Nach dem Löschen landet der Fokus in der Liste statt im Nichts */
  useEffect(() => {
    if (!focusList) {
      return undefined
    }
    /* Der Dialog gibt den Fokus beim Schließen selbst zurück; erst danach gilt der Fokus der Liste */
    const timer = window.setTimeout(() => {
      document.getElementById('channels-list')?.focus()
      setFocusList(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [focusList])

  /** Legt den eingegebenen Channel an; bei Ablehnung bleibt die Eingabe mit Meldung stehen. */
  function add(): void {
    const channel = newName.trim()
    const message = rejection({run: () => addChannel({channel, policy})})
    setAddError(message)
    if (message === null) {
      dispatch({apply: (p) => addChannel({channel, policy: p}), type: 'edit'})
      setNewName('')
    }
  }

  /** Klappt die Rechte-Liste eines Channels auf oder zu. */
  function toggle(args: {index: number}): void {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (!next.delete(args.index)) {
        next.add(args.index)
      }
      return next
    })
  }

  return (
    <section aria-labelledby="channels-title" className="flex max-w-3xl flex-col gap-3">
      <h2 className="text-base font-semibold" id="channels-title">
        Channels
      </h2>
      <form
        className="flex flex-col gap-1"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-describedby={addError === null ? undefined : 'channel-new-error'}
            aria-invalid={addError === null ? undefined : true}
            aria-label="Channel hinzufügen"
            className={`min-h-6 min-w-48 flex-1 rounded border bg-canvas px-2 font-mono outline-accent focus-visible:outline-2 ${addError === null ? 'border-line-strong' : 'border-danger'}`}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Neuer Channel"
            type="text"
            value={newName}
          />
          <button
            className="min-h-6 rounded bg-accent px-2 py-0.5 text-on-accent outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
            type="submit"
          >
            Hinzufügen
          </button>
        </div>
        {addError !== null && (
          <p className="break-words text-danger" id="channel-new-error" role="alert">
            {addError}
          </p>
        )}
      </form>
      {policy.channels.length === 0 && <p className="text-muted">Noch keine Channels.</p>}
      {policy.channels.length > 0 && (
        <ul
          aria-label="Channels"
          className="flex flex-col divide-y divide-line border-y border-line outline-accent focus-visible:outline-2"
          id="channels-list"
          tabIndex={-1}
        >
          {policy.channels.map((channel, index) => {
            const usages = findChannelUsages({channel, policy})
            const isOpen = expanded.has(index)
            const isSelected = selection?.index === index
            const own = findingsAt({findings, prefix: `channels[${index}]`})
            const reasonId = `channel-${index}-reason`
            return (
              <li
                className={`px-3 py-1.5 ${isSelected ? 'bg-accent-soft shadow-[inset_3px_0_0_0_var(--color-accent)]' : ''}`}
                id={`channel-${index}`}
                key={index}
              >
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <div className="min-w-40 flex-1">
                    <InlineEdit
                      ariaLabel={`Channel ${channel}`}
                      mono
                      onCommit={(to) => {
                        const message = rejection({run: () => renameChannel({from: channel, policy, to})})
                        if (message === null) {
                          dispatch({apply: (p) => renameChannel({from: channel, policy: p, to}), type: 'edit'})
                        }
                        return message
                      }}
                      value={channel}
                    />
                  </div>
                  {usages.length === 0 ? (
                    <span className="mt-0.5 text-muted">0 Rechte</span>
                  ) : (
                    <button
                      aria-expanded={isOpen}
                      className="min-h-6 rounded px-1 text-accent outline-accent hover:bg-accent-soft focus-visible:outline-2"
                      onClick={() => toggle({index})}
                      type="button"
                    >
                      {usages.length} {usages.length === 1 ? 'Recht' : 'Rechte'}
                    </button>
                  )}
                  <button
                    aria-describedby={usages.length > 0 ? reasonId : undefined}
                    aria-label={`Channel ${channel} löschen`}
                    className="min-h-6 rounded border border-line-strong bg-surface px-2 py-0.5 text-danger outline-accent hover:bg-danger-soft focus-visible:outline-2 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-surface"
                    disabled={usages.length > 0}
                    onClick={() => setPendingDelete(channel)}
                    title={
                      usages.length > 0
                        ? `Gesperrt: noch in ${usages.length} ${usages.length === 1 ? 'Recht' : 'Rechten'} verwendet`
                        : undefined
                    }
                    type="button"
                  >
                    Löschen
                  </button>
                </div>
                {usages.length > 0 && (
                  <p className="text-muted" id={reasonId}>
                    Gesperrt: noch in {usages.length} {usages.length === 1 ? 'Recht' : 'Rechten'} verwendet
                  </p>
                )}
                <FieldFindings findings={own} />
                {isOpen && usages.length > 0 && (
                  <ul aria-label={`Rechte in ${channel}`} className="mt-1 flex flex-col">
                    {usages.map((rightIndex) => (
                      <li key={rightIndex}>
                        <button
                          className="min-h-6 max-w-full rounded px-1 text-left font-mono break-words text-accent outline-accent hover:bg-accent-soft focus-visible:outline-2"
                          onClick={() => onOpenRight(rightIndex)}
                          type="button"
                        >
                          #{rightIndex + 1} {policy.rights[rightIndex]?.name ?? ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <ConfirmDialog
        confirmLabel="Löschen"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const channel = pendingDelete
          setPendingDelete(null)
          if (channel !== null) {
            dispatch({apply: (p) => deleteChannel({channel, policy: p}), type: 'edit'})
            setFocusList(true)
          }
        }}
        open={pendingDelete !== null}
        title="Channel löschen"
      >
        Channel {pendingDelete ?? ''} löschen?
      </ConfirmDialog>
    </section>
  )
}
