import type {Selection} from './Selection.ts'

/** Wandelt einen Befund-Pfad (z. B. `providers[3].name`) in Tab und Index um; null bei unbekanntem ersten Segment. */
export function parseFindingPath(args: {path: string}): Selection | null {
  const match = /^(channels|providers|rights)(?:\[(\d+)\])?(?![A-Za-z0-9_])/.exec(args.path)
  if (match === null) {
    return null
  }
  const tab = match[1] as Selection['tab']
  const index = match[2] === undefined ? null : Number(match[2])
  return {index, tab}
}
