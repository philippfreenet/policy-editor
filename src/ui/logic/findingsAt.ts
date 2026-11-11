import type {Finding} from '../../model/PolicyTypes.ts'

/** Liefert die Befunde, deren Pfad dem Präfix entspricht oder darunter liegt („rights[1]“ trifft nicht „rights[12]“). */
export function findingsAt(args: {findings: readonly Finding[]; prefix: string}): Finding[] {
  const {prefix} = args
  return args.findings.filter(
    (f) => f.path === prefix || f.path.startsWith(`${prefix}.`) || f.path.startsWith(`${prefix}[`),
  )
}
