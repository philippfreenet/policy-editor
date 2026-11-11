import {useEffect, useRef, useState} from 'react'
import {USER_ROLES} from '../../constants.ts'
import {deleteRight, moveRight, OperationError, upsertRight} from '../../model/operations.ts'
import type {Finding, PolicyFile, RightDef} from '../../model/PolicyTypes.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {ConditionBuilder} from '../condition/ConditionBuilder.tsx'
import {ActionMenu} from '../kit/ActionMenu.tsx'
import {Chip} from '../kit/Chip.tsx'
import {ChipSelect} from '../kit/ChipSelect.tsx'
import {ConfirmDialog} from '../kit/ConfirmDialog.tsx'
import {InlineEdit} from '../kit/InlineEdit.tsx'
import {findingsAt} from '../logic/findingsAt.ts'

const CHANNEL_LIMIT = 6

interface RightInspectorProps {
  /** Öffnet beim Einblenden das Namensfeld im Bearbeitungsmodus. */
  autoEditName: boolean
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  index: number
  onAutoEditDone: () => void
  onDeleted: () => void
  onMoved: (index: number) => void
  policy: PolicyFile
  right: RightDef
}

/** Entfernt genau den Eintrag an der Position aus der Liste. */
function withoutAt(args: {index: number; list: readonly string[]}): string[] {
  return args.list.filter((_, i) => i !== args.index)
}

interface FieldFindingsProps {
  findings: readonly Finding[]
}

/** Befundmeldungen direkt am Feld. */
function FieldFindings({findings}: FieldFindingsProps): React.JSX.Element | null {
  if (findings.length === 0) {
    return null
  }
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {findings.map((f, i) => (
        <li className={`break-words ${f.severity === 'error' ? 'text-danger' : 'text-warn'}`} key={i}>
          {f.message}
        </li>
      ))}
    </ul>
  )
}

interface RowProps {
  children: React.ReactNode
  label: string
}

/** Zeile „Wer / Wo / Wann“ mit kleiner Beschriftung links. */
function Row({children, label}: RowProps): React.JSX.Element {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-1 gap-1 border-t border-line py-3 sm:grid-cols-[5rem_minmax(0,1fr)]"
    >
      <h3 className="pt-1 text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** Rechte Spalte: das gewählte Recht als „Wer · Wo · Wann“ mit Kopfzeile, Position und Löschen. */
export function RightInspector({
  autoEditName,
  dispatch,
  findings,
  index,
  onAutoEditDone,
  onDeleted,
  onMoved,
  policy,
  right,
}: RightInspectorProps): React.JSX.Element {
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [targetId, setTargetId] = useState(String(index + 1))
  const [showAllChannels, setShowAllChannels] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const total = policy.rights.length
  const prefix = `rights[${index}]`
  const own = findingsAt({findings, prefix})
  const at = (field: string): Finding[] =>
    own.filter((f) => f.path === `${prefix}.${field}` || f.path.startsWith(`${prefix}.${field}[`))
  const known = ['name', 'description', 'roles', 'channels', 'condition']
  const general = own.filter(
    (f) =>
      !known.some(
        (field) =>
          f.path === `${prefix}.${field}` ||
          f.path.startsWith(`${prefix}.${field}[`) ||
          f.path.startsWith(`${prefix}.${field}.`),
      ),
  )

  useEffect(() => {
    if (autoEditName) {
      nameRef.current?.querySelector('button')?.click()
      onAutoEditDone()
    }
  }, [autoEditName, onAutoEditDone])

  /** Ändert das Recht anhand seines aktuellen Stands (nicht des gerenderten). */
  function update(args: {change: (r: RightDef) => RightDef; coalesce?: string}): void {
    dispatch({
      apply: (p) => {
        const current = p.rights[index]
        return current === undefined ? p : upsertRight({index, policy: p, right: args.change(current)})
      },
      coalesce: args.coalesce,
      type: 'edit',
    })
  }

  /** Benennt um; eine abgelehnte Operation liefert ihre Meldung an das Feld zurück. */
  function rename(name: string): string | null {
    try {
      upsertRight({index, policy, right: {...right, name}})
    } catch (error) {
      if (error instanceof OperationError) {
        return error.message
      }
      throw error
    }
    update({change: (r) => ({...r, name})})
    return null
  }

  const parsedTarget = Number(targetId)
  const clampedTarget = Number.isFinite(parsedTarget)
    ? Math.min(Math.max(Math.round(parsedTarget), 1), total)
    : index + 1
  const moveCount = Math.abs(clampedTarget - 1 - index)
  const unknownChannel = (channel: string): boolean => !policy.channels.includes(channel)
  const channelEntries = right.channels.map((channel, i) => ({channel, i}))
  /* Unbekannte Channels bleiben auch eingeklappt sichtbar, damit Fehler nicht verborgen sind */
  const shownChannels =
    showAllChannels || channelEntries.length <= CHANNEL_LIMIT + 1
      ? channelEntries
      : channelEntries.filter(({channel}, position) => position < CHANNEL_LIMIT || unknownChannel(channel))

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="min-w-0 break-words">
            <span data-field="name" ref={nameRef}>
              <InlineEdit ariaLabel="Name" mono onCommit={rename} size="lg" value={right.name} />
            </span>
          </h2>
          <FieldFindings findings={at('name')} />
          <InlineEdit
            ariaLabel="Beschreibung"
            onCommit={(description) => {
              update({change: (r) => ({...r, description}), coalesce: `right-${index}-description`})
              return null
            }}
            placeholder="Beschreibung hinzufügen"
            value={right.description}
          />
          <FieldFindings findings={at('description')} />
          <FieldFindings findings={general} />
        </div>
        <span className="mt-1 shrink-0 font-mono text-muted">ID {index + 1}</span>
        <ActionMenu
          items={[
            {
              label: 'Position ändern…',
              onSelect: () => {
                setTargetId(String(index + 1))
                setMoveOpen(true)
              },
            },
            {danger: true, label: 'Löschen…', onSelect: () => setDeleteOpen(true)},
          ]}
          label="Aktionen für Recht"
        />
      </div>

      <Row label="Wer">
        <div className="flex flex-wrap items-center gap-1">
          {right.roles.map((role, i) => (
            <Chip
              key={`${role}-${i}`}
              onRemove={() => {
                update({change: (r) => ({...r, roles: withoutAt({index: i, list: r.roles})})})
              }}
              removeLabel={`${role} entfernen`}
              tone={USER_ROLES.includes(role) ? 'who' : 'danger'}
            >
              {role}
            </Chip>
          ))}
          <ChipSelect
            label="+ Rolle"
            onChange={(roles) => {
              update({change: (r) => ({...r, roles})})
            }}
            options={USER_ROLES}
            selected={right.roles}
          />
        </div>
        {right.roles.length === 0 && <p className="mt-1 text-warn">Mindestens eine Rolle wählen</p>}
        <FieldFindings findings={at('roles')} />
      </Row>

      <Row label="Wo">
        <div className="flex flex-wrap items-center gap-1">
          {shownChannels.map(({channel, i}) => (
            <Chip
              key={`${channel}-${i}`}
              onRemove={() => {
                update({change: (r) => ({...r, channels: withoutAt({index: i, list: r.channels})})})
              }}
              removeLabel={`${channel} entfernen`}
              tone={unknownChannel(channel) ? 'danger' : 'where'}
            >
              {channel}
            </Chip>
          ))}
          {shownChannels.length < channelEntries.length && (
            <button
              className="min-h-6 rounded px-2 text-accent outline-accent hover:bg-accent-soft focus-visible:outline-2"
              onClick={() => setShowAllChannels(true)}
              type="button"
            >
              + {channelEntries.length - shownChannels.length} weitere
            </button>
          )}
          {showAllChannels && channelEntries.length > CHANNEL_LIMIT + 1 && (
            <button
              className="min-h-6 rounded px-2 text-accent outline-accent hover:bg-accent-soft focus-visible:outline-2"
              onClick={() => setShowAllChannels(false)}
              type="button"
            >
              weniger
            </button>
          )}
          <ChipSelect
            label="+ Channel"
            onChange={(channels) => {
              update({change: (r) => ({...r, channels})})
            }}
            options={policy.channels}
            searchable
            selected={right.channels}
            showAllNone
          />
        </div>
        {right.channels.length === 0 && <p className="mt-1 text-warn">Mindestens einen Channel wählen</p>}
        <FieldFindings findings={at('channels')} />
      </Row>

      <Row label="Wann">
        <ConditionBuilder
          findings={own}
          onChange={(next) => {
            update({
              change: (r) => {
                const {condition: _old, ...rest} = r
                return next === undefined ? rest : {...rest, condition: next}
              },
            })
          }}
          pathPrefix={`${prefix}.condition`}
          providers={policy.providers}
          value={right.condition}
        />
      </Row>

      <ConfirmDialog
        confirmLabel="Verschieben"
        onCancel={() => setMoveOpen(false)}
        onConfirm={() => {
          setMoveOpen(false)
          const to = clampedTarget - 1
          if (to !== index) {
            dispatch({apply: (p) => moveRight({from: index, policy: p, to}), type: 'edit'})
            onMoved(to)
          }
        }}
        open={moveOpen}
        title="Position ändern"
      >
        <label className="flex items-center gap-2">
          <span>Neue ID</span>
          <input
            className="min-h-6 w-20 rounded border border-line-strong bg-canvas px-2 text-fg outline-accent focus-visible:outline-2"
            max={total}
            min={1}
            onChange={(event) => setTargetId(event.target.value)}
            type="number"
            value={targetId}
          />
        </label>
        <p className="text-muted">Erlaubt sind die IDs 1 bis {total}.</p>
        <p className="mt-2">Die IDs von {moveCount} Rechten verschieben sich.</p>
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Löschen"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          dispatch({apply: (p) => deleteRight({index, policy: p}), type: 'edit'})
          onDeleted()
        }}
        open={deleteOpen}
        title="Recht löschen"
      >
        Recht {right.name} löschen? Die IDs von {total - index - 1} folgenden Rechten verschieben sich.
      </ConfirmDialog>
    </div>
  )
}
