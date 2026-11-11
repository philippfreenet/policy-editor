import {useState} from 'react'
import {USER_ROLES} from '../constants.ts'
import {formatCondition} from '../model/formatCondition.ts'
import type {PolicyFile} from '../model/PolicyTypes.ts'
import {rightsFor} from '../model/rightQueries.ts'
import {BUTTON} from './styles.ts'

interface MatrixTabProps {
  onOpenRight: (index: number) => void
  policy: PolicyFile
}

interface Cell {
  channel: string
  role: string
}

/** Übersicht Rolle × Channel: Anzahl der Rechte je Zelle; die gewählte Zelle listet ihre Rechte mit Bedingung. */
export function MatrixTab({onOpenRight, policy}: MatrixTabProps): React.JSX.Element {
  const [cell, setCell] = useState<Cell | null>(null)
  const counts = USER_ROLES.map((role) => policy.channels.map((channel) => rightsFor({channel, policy, role}).length))
  const max = Math.max(1, ...counts.flat())
  const selected = cell === null ? [] : rightsFor({channel: cell.channel, policy, role: cell.role})

  return (
    <section aria-labelledby="matrix-title" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900" id="matrix-title">
          Übersicht Rolle × Channel
        </h2>
        <p className="text-sm text-slate-700">
          Jede Zelle zählt die Rechte, die eine Rolle in einem Channel besitzt (Bedingungen nicht ausgewertet). Zelle
          wählen, um die Rechte zu sehen.
        </p>
      </div>
      {policy.channels.length === 0 ? (
        <p className="text-sm text-slate-700">Noch keine Channels angelegt.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-300 px-2 py-1 text-left font-medium text-slate-700" scope="col">
                  Rolle
                </th>
                {policy.channels.map((channel) => (
                  <th
                    className="border-b border-slate-300 px-2 py-1 text-left font-mono font-medium text-slate-900"
                    key={channel}
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
                  <th className="px-2 py-1 text-left font-mono font-medium text-slate-900" scope="row">
                    {role}
                  </th>
                  {policy.channels.map((channel, c) => {
                    const count = counts[r]?.[c] ?? 0
                    const active = cell?.role === role && cell.channel === channel
                    /* Deckkraft des Hintergrunds wächst mit der Anzahl (5 Stufen) */
                    const level = count === 0 ? 0 : Math.ceil((count / max) * 4)
                    const shade = ['bg-white', 'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300'][level]
                    return (
                      <td className="p-0.5" key={channel}>
                        <button
                          aria-label={`${role} in ${channel}: ${count} Rechte`}
                          aria-pressed={active}
                          className={`w-full min-w-12 rounded-md border px-2 py-1 text-right tabular-nums text-slate-900 hover:border-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${shade} ${
                            active ? 'border-indigo-700 ring-1 ring-indigo-700' : 'border-slate-300'
                          } ${count === 0 ? 'text-slate-500' : ''}`}
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
        <section aria-labelledby="matrix-cell-title" className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-slate-900" id="matrix-cell-title">
            <span className="font-mono">{cell.role}</span> in <span className="font-mono">{cell.channel}</span>:{' '}
            {selected.length} Rechte
          </h3>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-700">Keine Rechte für diese Kombination.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {selected.map((index) => {
                const right = policy.rights[index]
                if (right === undefined) {
                  return null
                }
                return (
                  <li
                    className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border border-slate-300 bg-white px-3 py-2"
                    key={index}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium break-words text-slate-900">
                        #{index + 1} {right.name}
                      </p>
                      <p className="font-mono text-xs break-words text-slate-700">
                        {right.condition === undefined ? 'statisch' : formatCondition({node: right.condition})}
                      </p>
                    </div>
                    <button className={BUTTON} onClick={() => onOpenRight(index)} type="button">
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
