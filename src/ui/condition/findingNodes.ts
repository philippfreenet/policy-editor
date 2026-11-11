import type {CompositeNode, ConditionNode, Finding} from '../../model/PolicyTypes.ts'
import type {NodePath} from '../conditionTreeOps.ts'

/** Schlüssel eines Knotenpfads für Nachschlage-Tabellen; die Wurzel hat den Schlüssel „“. */
export function pathKey(args: {path: NodePath}): string {
  return args.path.join('.')
}

/** Prüft, ob der Pfad im Baum auf einen existierenden Knoten zeigt. */
function exists(args: {path: NodePath; root: CompositeNode}): boolean {
  let current: ConditionNode = args.root
  for (const index of args.path) {
    if (typeof current === 'string' || current.conditions[index] === undefined) {
      return false
    }
    current = current.conditions[index]
  }
  return true
}

/** Ermittelt den Knotenpfad zu einem Befundpfad; `undefined`, wenn er nicht unter dem Präfix liegt. */
function nodePathOf(args: {findingPath: string; prefix: string}): NodePath | undefined {
  const {findingPath, prefix} = args
  if (findingPath !== prefix && !findingPath.startsWith(`${prefix}.`) && !findingPath.startsWith(`${prefix}[`)) {
    return undefined
  }
  const path: number[] = []
  let rest = findingPath.slice(prefix.length)
  for (let match = /^\.conditions\[(\d+)\]/.exec(rest); match !== null; match = /^\.conditions\[(\d+)\]/.exec(rest)) {
    path.push(Number(match[1]))
    rest = rest.slice(match[0].length)
  }
  return path
}

/**
 * Ordnet Befunde den Knoten des Bedingungsbaums zu. Befunde, die über einen Knoten hinaus weiterlaufen
 * (z. B. „….operator“), gehören zu diesem Knoten; nicht zuordenbare Befunde hängen an der Wurzel.
 */
export function groupFindingsByNode(args: {
  findings: readonly Finding[]
  prefix: string
  root: CompositeNode
}): Map<string, Finding[]> {
  const result = new Map<string, Finding[]>()
  for (const finding of args.findings) {
    const mapped = nodePathOf({findingPath: finding.path, prefix: args.prefix})
    const path = mapped !== undefined && exists({path: mapped, root: args.root}) ? mapped : []
    const key = pathKey({path})
    result.set(key, [...(result.get(key) ?? []), finding])
  }
  return result
}
