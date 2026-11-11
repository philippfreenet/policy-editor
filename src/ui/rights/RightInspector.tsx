import {useEffect, useRef, useState} from 'react'
import {USER_ROLES} from '../../constants.ts'
import {deleteRight, moveRight, upsertRight} from '../../model/operations.ts'
import type {Finding, PolicyFile, RightDef} from '../../model/PolicyTypes.ts'
import type {EditorAction} from '../../state/editorReducer.ts'
import {ConditionBuilder} from '../condition/ConditionBuilder.tsx'
import {ActionMenu} from '../kit/ActionMenu.tsx'
import {Chip} from '../kit/Chip.tsx'
import {ChipSelect} from '../kit/ChipSelect.tsx'
import {ConfirmDialog} from '../kit/ConfirmDialog.tsx'
import {InlineEdit} from '../kit/InlineEdit.tsx'
import {FieldFindings} from '../FieldFindings.tsx'
import {findingsAt} from '../logic/findingsAt.ts'
import {rejection} from '../logic/rejection.ts'

const CHANNEL_LIMIT = 6

interface RightInspectorProps {
  /** Öffnet beim Einblenden das Namensfeld im Bearbeitungsmodus. */
  autoEditName: boolean
  dispatch: (action: EditorAction) => void
  findings: readonly Finding[]
  index: number
  /** Feld, das in den Blick gerückt und fokussiert werden soll (name, description, roles, channels, condition). */
  jumpField: string | null
  /** Wird gemeldet, sobald der Namensfeld-Start verbraucht ist. */
  onAutoEditDone: () => void
  /** Wird gemeldet, sobald der Feldsprung ausgeführt wurde. */
  onJumpDone: () => void
  onDeleted: () => void
  onMoved: (index: number) => void
  policy: PolicyFile
  right: RightDef
}

/**
 * Übernimmt die Auswahl des Channel-Pickers. „alle“ liefert nur bekannte Channels; bereits gesetzte
 * unbekannte Channels bleiben dann erhalten (bekannte werden angefügt). „keine“ leert die Liste.
 */
function mergeChannelSelection(args: {current: readonly string[]; known: readonly string[]; next: string[]}): string[] {
  const {current, known, next} = args
  if (next.length === 0) {
    return []
  }
  const lostUnknown = current.some((c) => !known.includes(c) && !next.includes(c))
  if (!lostUnknown) {
    return next
  }
  return [...current, ...known.filter((c) => !current.includes(c))]
}

/** Entfernt genau den Eintrag an der Position aus der Liste. */
function withoutAt(args: {index: number; list: readonly string[]}): string[] {
  return args.list.filter((_, i) => i !== args.index)
}

interface RowProps {
  children: React.ReactNode
  /** Feldschlüssel für den Sprung aus Befunden (roles, channels, condition). */
  field: string
  /** Beschriftung der Zeile. */
  label: string
}

/** Zeile „Wer / Wo / Wann“ mit kleiner Beschriftung links. */
function Row({children, field, label}: RowProps): React.JSX.Element {
  return (
    <section
      aria-label={label}
      data-field={field}
      className="grid grid-cols-1 gap-1 border-t border-line py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-3"
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
  jumpField,
  onAutoEditDone,
  onJumpDone,
  onDeleted,
  onMoved,
  policy,
  right,
}: RightInspectorProps): React.JSX.Element {
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [targetId, setTargetId] = useState(String(index + 1))
  const [showAllChannels, setShowAllChannels] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const total = policy.rights.length
  const prefix = `rights[${index}]`
  const own = findingsAt({findings, prefix})
  /** Befunde, die genau am Feld oder darunter liegen. */
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
      onAutoEditDone()
    }
  }, [autoEditName, onAutoEditDone])

  /* Feldsprung: Block in den Blick holen und das erste bedienbare Element fokussieren */
  useEffect(() => {
    if (jumpField === null) {
      return
    }
    const block = rootRef.current?.querySelector<HTMLElement>(`[data-field="${jumpField}"]`)
    block?.scrollIntoView({block: 'nearest'})
    block?.querySelector<HTMLElement>('button, input, a[href]')?.focus()
    onJumpDone()
  }, [jumpField, onJumpDone])

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
    const message = rejection({run: () => upsertRight({index, policy, right: {...right, name}})})
    if (message !== null) {
      return message
    }
    update({change: (r) => ({...r, name})})
    return null
  }

  const parsedTarget = /^\d+$/.test(targetId.trim()) ? Number(targetId.trim()) : Number.NaN
  const targetValid = Number.isInteger(parsedTarget) && parsedTarget >= 1 && parsedTarget <= total
  const moveCount = targetValid ? Math.abs(parsedTarget - 1 - index) : 0
  /* Rechte, deren ID sich beim Verschieben ändert (ohne das verschobene Recht selbst) */
  const shifted = targetValid
    ? policy.rights.slice(
        Math.min(index + 1, parsedTarget - 1),
        Math.max(index, parsedTarget - 1) + (parsedTarget - 1 > index ? 1 : 0),
      )
    : []
  /** Ein Channel, der nicht in der Channel-Liste der Policy steht. */
  const unknownChannel = (channel: string): boolean => !policy.channels.includes(channel)
  const channelEntries = right.channels.map((channel, i) => ({channel, i}))
  /* Unbekannte Channels bleiben auch eingeklappt sichtbar, damit Fehler nicht verborgen sind */
  const shownChannels =
    showAllChannels || channelEntries.length <= CHANNEL_LIMIT
      ? channelEntries
      : channelEntries.filter(({channel}, position) => position < CHANNEL_LIMIT || unknownChannel(channel))

  return (
    <div className="min-w-0" ref={rootRef}>
      <div className="flex items-start gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="sr-only min-w-0 break-words">{right.name}</h2>
          <div data-field="name">
            <InlineEdit
              ariaLabel="Name"
              mono
              onCommit={rename}
              size="lg"
              startEditing={autoEditName}
              value={right.name}
            />
          </div>
          <FieldFindings findings={at('name')} />
          <div data-field="description">
            <InlineEdit
              ariaLabel="Beschreibung"
              onCommit={(description) => {
                update({change: (r) => ({...r, description}), coalesce: `right-${index}-description`})
                return null
              }}
              placeholder="Beschreibung hinzufügen"
              value={right.description}
            />
          </div>
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

      <Row field="roles" label="Wer">
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

      <Row field="channels" label="Wo">
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
          {showAllChannels && channelEntries.length > CHANNEL_LIMIT && (
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
            onChange={(next) => {
              update({
                change: (r) => ({
                  ...r,
                  channels: mergeChannelSelection({current: r.channels, known: policy.channels, next}),
                }),
              })
            }}
            options={[...new Set(policy.channels)]}
            searchable
            selected={right.channels}
            showAllNone
          />
        </div>
        {right.channels.length === 0 && <p className="mt-1 text-warn">Mindestens einen Channel wählen</p>}
        <FieldFindings findings={at('channels')} />
      </Row>

      <Row field="condition" label="Wann">
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
        confirmDisabled={!targetValid}
        confirmLabel="Verschieben"
        onCancel={() => setMoveOpen(false)}
        onConfirm={() => {
          setMoveOpen(false)
          const to = parsedTarget - 1
          if (targetValid && to !== index) {
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
        {targetValid ? (
          <p className="mt-2">
            {moveCount === 1
              ? 'Die ID von 1 Recht verschiebt sich.'
              : `Die IDs von ${moveCount} Rechten verschieben sich.`}
            {shifted.length > 0 && (
              <span className="mt-1 block text-muted break-words" data-testid="move-preview">
                Betroffen:{' '}
                {shifted
                  .slice(0, 5)
                  .map((right) => right.name)
                  .join(', ')}
                {shifted.length > 5 ? ', …' : ''}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-2 text-danger" role="alert">
            Bitte eine ganze Zahl von 1 bis {total} eingeben.
          </p>
        )}
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
        Recht {right.name} löschen?{' '}
        {total - index - 1 === 1
          ? 'Die ID von 1 folgenden Recht verschiebt sich.'
          : `Die IDs von ${total - index - 1} folgenden Rechten verschieben sich.`}
      </ConfirmDialog>
    </div>
  )
}
