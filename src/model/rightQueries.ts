import type {ConditionNode, PolicyFile, RightDef} from './PolicyTypes.ts'

/** Filterkriterien für die Rechteliste; null bzw. leerer Text bedeutet „kein Filter“. */
export interface RightFilter {
  channel: string | null
  provider: string | null
  query: string
  role: string | null
}

/** Sammelt alle Provider-Namen eines Bedingungsbaums (beliebige Tiefe). */
export function conditionProviders(args: {node: ConditionNode}): Set<string> {
  const result = new Set<string>()
  const visit = (node: ConditionNode): void => {
    if (typeof node === 'string') {
      result.add(node)
    } else {
      node.conditions.forEach(visit)
    }
  }
  visit(args.node)
  return result
}

/** Prüft, ob ein Recht alle gesetzten Filterkriterien erfüllt. */
export function matchesFilter(args: {filter: RightFilter; right: RightDef}): boolean {
  const {filter, right} = args
  const needle = filter.query.trim().toLowerCase()
  if (needle.length > 0 && ![right.name, right.description].some((t) => t.toLowerCase().includes(needle))) {
    return false
  }
  if (filter.role !== null && !right.roles.includes(filter.role)) {
    return false
  }
  if (filter.channel !== null && !right.channels.includes(filter.channel)) {
    return false
  }
  if (filter.provider !== null) {
    return right.condition !== undefined && conditionProviders({node: right.condition}).has(filter.provider)
  }
  return true
}

/** Liefert die aufsteigenden Indizes der Rechte, die eine Rolle im Channel besitzt. */
export function rightsFor(args: {channel: string; policy: PolicyFile; role: string}): number[] {
  const result: number[] = []
  args.policy.rights.forEach((right, index) => {
    if (right.roles.includes(args.role) && right.channels.includes(args.channel)) {
      result.push(index)
    }
  })
  return result
}
