interface UsageListProps {
  names: readonly string[]
}

/** Aufklappbare Liste der nutzenden Rechte; ohne Nutzung ein kurzer Hinweis. */
export function UsageList({names}: UsageListProps): React.JSX.Element {
  if (names.length === 0) {
    return <p className="text-xs text-slate-700">Wird von keinem Recht verwendet.</p>
  }
  return (
    <details className="text-xs text-slate-800">
      <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-indigo-700">
        Verwendet von {names.length} {names.length === 1 ? 'Recht' : 'Rechten'}
      </summary>
      <ul className="mt-1 list-disc pl-5">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </details>
  )
}
