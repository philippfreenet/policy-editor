import type {PolicyFile} from '../model/PolicyTypes.ts'

/** Beschriftet Rechte-Indizes für die Anzeige als `#<id> <name>` (id = Index + 1). */
export function usageNames(args: {indices: readonly number[]; policy: PolicyFile}): string[] {
  return args.indices.map((index) => `#${index + 1} ${args.policy.rights[index]?.name ?? ''}`)
}
