import type {Finding} from '../model/PolicyTypes.ts'

interface FieldFindingsProps {
  findings: readonly Finding[]
}

/** Befundmeldungen direkt am Feld; ohne Befunde wird nichts gezeichnet. */
export function FieldFindings({findings}: FieldFindingsProps): React.JSX.Element | null {
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
