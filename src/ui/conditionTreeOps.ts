import {OperationError} from '../model/OperationError.ts'
import type {CompositeNode, ConditionNode} from '../model/PolicyTypes.ts'

/** Pfad zu einem Knoten als Folge von Kind-Indizes; die Wurzel hat den leeren Pfad. */
export type NodePath = readonly number[]

/** Liefert die Gruppe unter dem Pfad; wirft, wenn der Pfad ins Leere oder auf ein Blatt zeigt. */
function groupAt(args: {path: NodePath; root: CompositeNode}): CompositeNode {
  let current: ConditionNode = args.root
  for (const index of args.path) {
    if (typeof current === 'string') {
      throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
    }
    const next: ConditionNode | undefined = current.conditions[index]
    if (next === undefined) {
      throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
    }
    current = next
  }
  if (typeof current === 'string') {
    throw new OperationError('Der Knoten ist keine Gruppe')
  }
  return current
}

/** Zerlegt einen nicht leeren Pfad in Elternpfad und Kind-Index; wirft für die Wurzel. */
function splitPath(args: {path: NodePath}): {index: number; parent: NodePath} {
  const index = args.path[args.path.length - 1]
  if (index === undefined) {
    throw new OperationError('Die Wurzel hat keine Elterngruppe')
  }
  return {index, parent: args.path.slice(0, -1)}
}

/** Ersetzt den Knoten unter dem Pfad; der leere Pfad ersetzt die Wurzel und verlangt eine Gruppe. */
export function updateNodeAt(args: {node: ConditionNode; path: NodePath; root: CompositeNode}): CompositeNode {
  if (args.path.length === 0) {
    if (typeof args.node === 'string') {
      throw new OperationError('Die Wurzel muss eine Gruppe sein')
    }
    return structuredClone(args.node)
  }
  const root = structuredClone(args.root)
  const {index, parent} = splitPath({path: args.path})
  const group = groupAt({path: parent, root})
  if (index >= group.conditions.length) {
    throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
  }
  group.conditions[index] = structuredClone(args.node)
  return root
}

/** Entfernt den Knoten unter dem Pfad (nicht die Wurzel). */
export function removeNodeAt(args: {path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  const {index, parent} = splitPath({path: args.path})
  const group = groupAt({path: parent, root})
  if (index >= group.conditions.length) {
    throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
  }
  group.conditions.splice(index, 1)
  return root
}

/** Hängt einen Knoten ans Ende der Gruppe unter dem Pfad. */
export function insertChildAt(args: {child: ConditionNode; path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  groupAt({path: args.path, root}).conditions.push(structuredClone(args.child))
  return root
}

/** Verschiebt den Knoten unter dem Pfad innerhalb seiner Gruppe um eine Stelle; am Rand bleibt alles unverändert. */
export function moveChildWithin(args: {direction: -1 | 1; path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  const {index, parent} = splitPath({path: args.path})
  const group = groupAt({path: parent, root})
  if (index >= group.conditions.length) {
    throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
  }
  const target = index + args.direction
  if (target < 0 || target >= group.conditions.length) {
    return root
  }
  const [moved] = group.conditions.splice(index, 1)
  group.conditions.splice(target, 0, moved as ConditionNode)
  return root
}

/** Setzt den Operator der Gruppe unter dem Pfad. */
export function setOperatorAt(args: {operator: string; path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  groupAt({path: args.path, root}).operator = args.operator
  return root
}

/** Löst die Gruppe unter dem Pfad auf: ihre Kinder rücken an ihre Stelle in der Elterngruppe. */
export function dissolveGroupAt(args: {path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  const {index, parent} = splitPath({path: args.path})
  const group = groupAt({path: parent, root})
  const target = group.conditions[index]
  if (target === undefined) {
    throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
  }
  if (typeof target === 'string') {
    throw new OperationError('Der Knoten ist keine Gruppe')
  }
  group.conditions.splice(index, 1, ...target.conditions)
  return root
}

/** Umschließt den Knoten unter dem Pfad mit einer neuen AND-Gruppe. */
export function wrapInGroupAt(args: {path: NodePath; root: CompositeNode}): CompositeNode {
  const root = structuredClone(args.root)
  const {index, parent} = splitPath({path: args.path})
  const group = groupAt({path: parent, root})
  const target = group.conditions[index]
  if (target === undefined) {
    throw new OperationError('Pfad im Bedingungsbaum ist ungültig')
  }
  group.conditions[index] = {conditions: [target], operator: 'AND'}
  return root
}
