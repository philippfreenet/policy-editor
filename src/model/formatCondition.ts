import type {ConditionNode} from './PolicyTypes.ts'

/**
 * Stellt einen Bedingungsbaum als lesbare Formel dar, z. B. `A AND (B OR C)`.
 * Verschachtelte Gruppen stehen in Klammern, leere Gruppen als `()`.
 */
export function formatCondition(args: {node: ConditionNode}): string {
  return formatNode({node: args.node, root: true})
}

/** Formatiert einen Knoten; nur die Wurzel kommt ohne Klammern aus. */
function formatNode(args: {node: ConditionNode; root: boolean}): string {
  if (typeof args.node === 'string') {
    return args.node
  }
  const inner = args.node.conditions
    .map((child) => formatNode({node: child, root: false}))
    .join(` ${args.node.operator} `)
  return args.root && inner.length > 0 ? inner : `(${inner})`
}
