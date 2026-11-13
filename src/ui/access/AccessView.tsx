import {useId, useState} from 'react'
import type {PolicyFile} from '../../model/PolicyTypes.ts'
import {checkAccess, DEFAULT_ROLE, knownRoles} from '../logic/checkAccess.ts'
import type {AccessRow, AccessStatus} from '../logic/checkAccess.ts'

interface AccessViewProps {
  onOpenRight: (index: number) => void
  policy: PolicyFile
}

const SELECT =
  'min-h-6 rounded border border-line-strong bg-canvas px-2 font-mono text-fg outline-accent focus-visible:outline-2'

const GROUPS: {hint: string; status: AccessStatus; title: string}[] = [
  {hint: 'Ohne Provider-Prüfung gewährt.', status: 'granted', title: 'Gewährt'},
  {
    hint: 'Die Provider entscheiden zur Laufzeit; hier nicht ausgewertet.',
    status: 'conditional',
    title: 'Abhängig von Bedingung',
  },
  {hint: 'Nicht mit dieser Kombination verknüpft.', status: 'unavailable', title: 'Nicht verfügbar'},
]

/**
 * „Wer darf was“: zeigt für Channel und Rolle, welche Rechte policy-service sofort gewährt, welche von
 * Providern abhängen und welche gar nicht verknüpft sind. Provider-Ergebnisse werden nicht simuliert.
 */
export function AccessView({onOpenRight, policy}: AccessViewProps): React.JSX.Element {
  const roles = knownRoles({policy})
  const [channel, setChannel] = useState(policy.channels[0] ?? '')
  const [role, setRole] = useState(roles[0] ?? DEFAULT_ROLE)
  const channelId = useId()
  const roleId = useId()
  /* Ein gelöschter Channel fällt auf den ersten verbliebenen zurück */
  const activeChannel = policy.channels.includes(channel) ? channel : (policy.channels[0] ?? '')
  const rows = checkAccess({channel: activeChannel, policy, role})

  return (
    <section aria-labelledby="access-title" className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold" id="access-title">
          Wer darf was
        </h2>
        <p className="text-muted">
          Channel und Rolle wählen wie beim Aufruf von policy-service. Bedingungen werden nicht ausgewertet, da die
          Provider echte Vertrags- und Kundendaten abfragen.
        </p>
      </div>
      {policy.channels.length === 0 ? (
        <p className="text-muted">Noch keine Channels angelegt.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2" htmlFor={channelId}>
              <span>Channel</span>
              <select
                className={SELECT}
                id={channelId}
                onChange={(event) => setChannel(event.target.value)}
                value={activeChannel}
              >
                {policy.channels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2" htmlFor={roleId}>
              <span>Rolle</span>
              <select className={SELECT} id={roleId} onChange={(event) => setRole(event.target.value)} value={role}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {role === DEFAULT_ROLE && (
            <p className="text-muted">
              <span className="font-mono">{DEFAULT_ROLE}</span> erhält verknüpfte Rechte ohne Prüfung der Bedingung.
            </p>
          )}
          {GROUPS.map((group) => (
            <AccessGroup
              hint={group.hint}
              key={group.status}
              onOpenRight={onOpenRight}
              rows={rows.filter((row) => row.status === group.status)}
              status={group.status}
              title={group.title}
            />
          ))}
        </>
      )}
    </section>
  )
}

/** Eine Gruppe von Rechten mit Überschrift, Zähler und Liste; nicht verfügbare starten eingeklappt. */
function AccessGroup(props: {
  hint: string
  onOpenRight: (index: number) => void
  rows: AccessRow[]
  status: AccessStatus
  title: string
}): React.JSX.Element {
  const {hint, onOpenRight, rows, status, title} = props
  const headingId = useId()
  const list =
    rows.length === 0 ? (
      <p className="text-muted">Keine Rechte.</p>
    ) : (
      <ul aria-labelledby={headingId} className="flex flex-col divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <li key={row.index}>
            <button
              className="flex w-full min-w-0 flex-col gap-0.5 px-3 py-1.5 text-left outline-accent hover:bg-sidebar focus-visible:outline-2 focus-visible:-outline-offset-2"
              onClick={() => onOpenRight(row.index)}
              type="button"
            >
              <span className="font-mono font-medium break-words">
                #{row.index + 1} {row.name}
              </span>
              {row.formula !== null && <span className="font-mono break-words text-muted">{row.formula}</span>}
              {row.reason !== null && <span className="break-words text-muted">{row.reason}</span>}
            </button>
          </li>
        ))}
      </ul>
    )
  const heading = (
    <>
      {title} <span className="font-normal text-muted">({rows.length})</span>
    </>
  )
  if (status === 'unavailable') {
    return (
      <details className="flex flex-col gap-1">
        <summary className="min-h-6 cursor-pointer rounded font-semibold outline-accent focus-visible:outline-2">
          <span id={headingId}>{heading}</span>
        </summary>
        <p className="text-muted">{hint}</p>
        {list}
      </details>
    )
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h3 className="font-semibold" id={headingId}>
        {heading}
      </h3>
      <p className="text-muted">{hint}</p>
      {list}
    </section>
  )
}
