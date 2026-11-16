import type {CompositeNode, ConditionNode, PolicyFile} from './PolicyTypes.ts'

/**
 * Glättet einen Bedingungsbaum, ohne die Logik zu ändern:
 * Untergruppen mit gleichem Operator werden in die Elterngruppe aufgelöst (Assoziativität von AND/OR),
 * Gruppen mit genau einem Provider werden durch diesen ersetzt, und eine Wurzel mit nur einer
 * Untergruppe übernimmt deren Inhalt. Gruppen mit anderem Operator und leere Gruppen bleiben unverändert.
 */
export function flattenCondition(args: {node: CompositeNode}): CompositeNode {
  const conditions: ConditionNode[] = []
  for (const child of args.node.conditions) {
    if (typeof child === 'string') {
      conditions.push(child)
      continue
    }
    const flat = flattenCondition({node: child})
    const [only] = flat.conditions
    if (flat.conditions.length === 1 && typeof only === 'string') {
      conditions.push(only)
    } else if (flat.operator === args.node.operator && flat.conditions.length > 0) {
      conditions.push(...flat.conditions)
    } else {
      conditions.push(flat)
    }
  }
  const [only] = conditions
  if (conditions.length === 1 && typeof only === 'object') {
    return only
  }
  return {...args.node, conditions}
}

/** Glättet die Bedingungen aller Rechte; liefert dieselbe Policy zurück, wenn sich nichts ändert. */
export function flattenPolicy(args: {policy: PolicyFile}): PolicyFile {
  let changed = false
  const rights = args.policy.rights.map((right) => {
    if (right.condition === undefined) {
      return right
    }
    const condition = flattenCondition({node: right.condition})
    if (JSON.stringify(condition) === JSON.stringify(right.condition)) {
      return right
    }
    changed = true
    return {...right, condition}
  })
  return changed ? {...args.policy, rights} : args.policy
}
