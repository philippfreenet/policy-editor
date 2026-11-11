import {useState} from 'react'
import {USER_ROLES} from '../../constants.ts'
import {formatCondition} from '../../model/formatCondition.ts'
import type {PolicyFile} from '../../model/PolicyTypes.ts'
import {rightsFor} from '../../model/rightQueries.ts'

interface OverviewViewProps {
  onOpenRight: (index: number) => void
  policy: PolicyFile
}

interface Cell {
  channel: string
  role: string
}

/* Deckkraft des Akzents wächst mit der Anzahl (5 Stufen) */
const SHADES = ['bg-surface', 'bg-accent/10', 'bg-accent/20', 'bg-accent/30', 'bg-accent/40']

/** Übersicht Rolle × Channel: Anzahl der Rechte je Zelle; die gewählte Zelle listet ihre Rechte mit Formel. */
export function OverviewView({onOpenRight, policy}: OverviewViewProps): React.JSX.Element {
  const [cell, setCell] = useState<Cell | null>(null)
  const counts = USER_ROLES.map((role) => policy.channels.map((channel) => rightsFor({channel, policy, role}).length))
  const max = Math.max(1, ...counts.flat())
  const selected = cell === null ? [] : rightsFor({channel: cell.channel, policy, role: cell.role})

  return (
    <section aria-labelledby="overview-title" className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold" id="overview-title">
          Übersicht Rolle × Channel
        </h2>
        <p className="text-muted">
          Jede Zelle zählt die Rechte, die eine Rolle in einem Channel besitzt (Bedingungen nicht ausgewertet). Zelle
          wählen, um die Rechte zu sehen.
        </p>
      </div>
      {policy.channels.length === 0 ? (
        <p className="text-muted">Noch keine Channels angelegt.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border-b border-line px-2 py-1 text-left font-medium text-muted" scope="col">
                  Rolle
                </th>
                {policy.channels.map((channel, c) => (
                  <th
                    className="border-b border-line px-2 py-1 text-left font-mono font-medium break-all"
                    key={c}
                    scope="col"
                  >
                    {channel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USER_ROLES.map((role, r) => (
                <tr key={role}>
                  <th className="px-2 py-1 text-left font-mono font-medium" scope="row">
                    {role}
                  </th>
                  {policy.channels.map((channel, c) => {
                    const count = counts[r]?.[c] ?? 0
                    const active = cell?.role === role && cell.channel === channel
                    const level = count === 0 ? 0 : Math.ceil((count / max) * 4)
                    return (
                      <td className="p-0.5" key={c}>
                        <button
                          aria-label={`${role} in ${channel}: ${count} Rechte`}
                          aria-pressed={active}
                          className={`min-h-6 w-full min-w-12 rounded border px-2 py-1 text-right tabular-nums outline-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${SHADES[level]} ${
                            active ? 'border-accent ring-1 ring-accent' : 'border-line'
                          } ${count === 0 ? 'text-muted' : 'text-fg'}`}
                          onClick={() => setCell(active ? null : {channel, role})}
                          type="button"
                        >
                          {count}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cell !== null && (
        <section aria-labelledby="overview-cell-title" className="flex flex-col gap-2">
          <h3 className="text-base font-semibold break-words" id="overview-cell-title">
            <span className="font-mono">{cell.role}</span> in <span className="font-mono">{cell.channel}</span>:{' '}
            {selected.length} {selected.length === 1 ? 'Recht' : 'Rechte'}
          </h3>
          {selected.length === 0 ? (
            <p className="text-muted">Keine Rechte für diese Kombination.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {selected.map((index) => {
                const right = policy.rights[index]
                if (right === undefined) {
                  return null
                }
                return (
                  <li className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-1.5" key={index}>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-medium break-words">
                        #{index + 1} {right.name}
                      </p>
                      <p className="font-mono break-words text-muted">
                        {right.condition === undefined ? 'statisch' : formatCondition({node: right.condition})}
                      </p>
                    </div>
                    <button
                      className="min-h-6 rounded border border-line-strong bg-surface px-2 py-0.5 outline-accent hover:bg-sidebar focus-visible:outline-2"
                      onClick={() => onOpenRight(index)}
                      type="button"
                    >
                      Öffnen
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </section>
  )
}
