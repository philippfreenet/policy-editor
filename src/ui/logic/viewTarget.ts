export type View = 'access' | 'channels' | 'overview' | 'providers' | 'raw' | 'rights'

export interface ViewTarget {
  field: string | null
  index: number | null
  view: View
}

const PATH_PATTERN = /^(channels|providers|rights)(?:\[(\d+)\])?(?:\.([^.[\]]+))?/

/** Ordnet einen Befund-Pfad der Ansicht, dem Eintrag und dem Feld zu; unbekannte Pfade liefern null. */
export function viewTarget(args: {path: string}): ViewTarget | null {
  const match = PATH_PATTERN.exec(args.path)
  const view = match?.[1] as Exclude<View, 'access' | 'overview' | 'raw'> | undefined
  if (match === null || view === undefined) {
    return null
  }
  const index = match[2] === undefined ? null : Number(match[2])
  return {field: index === null ? null : (match[3] ?? null), index, view}
}
