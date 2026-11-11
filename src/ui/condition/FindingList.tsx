import type {Finding} from '../../model/PolicyTypes.ts'

interface FindingListProps {
  findings: readonly Finding[]
  /** Id, auf die das umgebende Element per aria-describedby verweist. */
  id: string
}

/** Zeigt die Befunde eines Knotens in Warn-/Fehlerfarbe; rendert nichts ohne Befunde. */
export function FindingList({findings, id}: FindingListProps): React.JSX.Element | null {
  if (findings.length === 0) {
    return null
  }
  return (
    <ul className="list-none" id={id}>
      {findings.map((finding, index) => (
        <li className={`break-words ${finding.severity === 'warning' ? 'text-warn' : 'text-danger'}`} key={index}>
          {finding.severity === 'warning' ? 'Warnung: ' : 'Fehler: '}
          {finding.message}
        </li>
      ))}
    </ul>
  )
}
