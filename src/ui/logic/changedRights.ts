import type {PolicyFile} from '../../model/PolicyTypes.ts'
import {parsePolicy} from '../../model/parse.ts'

/** Liefert die Indizes der Rechte, die gegenüber dem geladenen Original neu oder verändert sind. */
export function changedRights(args: {original: string | null; policy: PolicyFile}): Set<number> {
  const changed = new Set<number>()
  if (args.original === null) {
    return changed
  }
  const parsed = parsePolicy({text: args.original})
  if (!parsed.ok) {
    return changed
  }
  /* Rechte gleichen Namens werden in Reihenfolge ihres Auftretens paarweise zugeordnet */
  const originals = new Map<string, string[]>()
  for (const right of parsed.policy.rights) {
    originals.set(right.name, [...(originals.get(right.name) ?? []), JSON.stringify(right)])
  }
  const seen = new Map<string, number>()
  args.policy.rights.forEach((right, index) => {
    const occurrence = seen.get(right.name) ?? 0
    seen.set(right.name, occurrence + 1)
    if (originals.get(right.name)?.[occurrence] !== JSON.stringify(right)) {
      changed.add(index)
    }
  })
  return changed
}
