import {isBlank} from './isBlank.ts'
import {OperationError} from './OperationError.ts'
import type {ConditionNode, PolicyFile, ProviderDef, RightDef} from './PolicyTypes.ts'

export {OperationError}

/** Wirft, wenn der Name leer oder nur Leerraum ist. */
function assertNotBlank(args: {name: string}): void {
  if (isBlank({value: args.name})) {
    throw new OperationError('Name darf nicht leer sein')
  }
}

/** Wirft, wenn der Index nicht in der Liste liegt. */
function assertIndex(args: {index: number; length: number}): void {
  if (!Number.isInteger(args.index) || args.index < 0 || args.index >= args.length) {
    throw new OperationError('Ungültige Position')
  }
}

/** Prüft rekursiv, ob der Provider-Name irgendwo im Bedingungsbaum vorkommt. */
function nodeUsesProvider(args: {name: string; node: ConditionNode}): boolean {
  if (typeof args.node === 'string') {
    return args.node === args.name
  }
  return args.node.conditions.some((child) => nodeUsesProvider({name: args.name, node: child}))
}

/** Ersetzt rekursiv jeden Provider-Namen `from` durch `to` und liefert einen neuen Baum. */
function renameInNode(args: {from: string; node: ConditionNode; to: string}): ConditionNode {
  if (typeof args.node === 'string') {
    return args.node === args.from ? args.to : args.node
  }
  return {
    ...args.node,
    conditions: args.node.conditions.map((child) => renameInNode({from: args.from, node: child, to: args.to})),
  }
}

/** Liefert die aufsteigenden Indizes der Rechte, die den Channel verwenden. */
export function findChannelUsages(args: {channel: string; policy: PolicyFile}): number[] {
  const result: number[] = []
  args.policy.rights.forEach((right, index) => {
    if (right.channels.includes(args.channel)) {
      result.push(index)
    }
  })
  return result
}

/** Liefert die aufsteigenden Indizes der Rechte, deren Bedingung den Provider (in beliebiger Tiefe) nennt. */
export function findProviderUsages(args: {name: string; policy: PolicyFile}): number[] {
  const result: number[] = []
  args.policy.rights.forEach((right, index) => {
    if (right.condition !== undefined && nodeUsesProvider({name: args.name, node: right.condition})) {
      result.push(index)
    }
  })
  return result
}

/** Hängt einen neuen Channel an. */
export function addChannel(args: {channel: string; policy: PolicyFile}): PolicyFile {
  assertNotBlank({name: args.channel})
  if (args.policy.channels.includes(args.channel)) {
    throw new OperationError(`Channel ${args.channel} existiert bereits`)
  }
  const policy = structuredClone(args.policy)
  policy.channels.push(args.channel)
  return policy
}

/** Benennt einen Channel um und zieht ihn in allen Rechten nach. */
export function renameChannel(args: {from: string; policy: PolicyFile; to: string}): PolicyFile {
  assertNotBlank({name: args.to})
  if (!args.policy.channels.includes(args.from)) {
    throw new OperationError(`Channel ${args.from} existiert nicht`)
  }
  const policy = structuredClone(args.policy)
  if (args.from === args.to) {
    return policy
  }
  if (policy.channels.includes(args.to)) {
    throw new OperationError(`Channel ${args.to} existiert bereits`)
  }
  policy.channels = policy.channels.map((channel) => (channel === args.from ? args.to : channel))
  for (const right of policy.rights) {
    right.channels = right.channels.map((channel) => (channel === args.from ? args.to : channel))
  }
  return policy
}

/** Löscht einen Channel, sofern kein Recht ihn verwendet. */
export function deleteChannel(args: {channel: string; policy: PolicyFile}): PolicyFile {
  if (!args.policy.channels.includes(args.channel)) {
    throw new OperationError(`Channel ${args.channel} existiert nicht`)
  }
  const usages = findChannelUsages({channel: args.channel, policy: args.policy})
  if (usages.length > 0) {
    throw new OperationError(`Channel ${args.channel} wird noch von ${usages.length} Recht(en) verwendet`)
  }
  const policy = structuredClone(args.policy)
  policy.channels = policy.channels.filter((channel) => channel !== args.channel)
  return policy
}

/** Benennt den Provider am Index um (Eindeutigkeit gegenüber den übrigen) und zieht alle Referenzen nach. */
export function renameProviderAt(args: {index: number; policy: PolicyFile; to: string}): PolicyFile {
  assertNotBlank({name: args.to})
  const policy = structuredClone(args.policy)
  const current = policy.providers[args.index]
  if (current === undefined || current.name === args.to) {
    return policy
  }
  if (policy.providers.some((provider, index) => index !== args.index && provider.name === args.to)) {
    throw new OperationError(`Provider ${args.to} existiert bereits`)
  }
  const from = current.name
  current.name = args.to
  for (const right of policy.rights) {
    if (right.condition !== undefined) {
      right.condition = renameInNode({from, node: right.condition, to: args.to}) as typeof right.condition
    }
  }
  return policy
}

/** Benennt einen Provider um und zieht ihn in allen Bedingungen nach. */
export function renameProvider(args: {from: string; policy: PolicyFile; to: string}): PolicyFile {
  assertNotBlank({name: args.to})
  const index = args.policy.providers.findIndex((provider) => provider.name === args.from)
  if (index < 0) {
    throw new OperationError(`Provider ${args.from} existiert nicht`)
  }
  return renameProviderAt({index, policy: args.policy, to: args.to})
}

/** Legt einen Provider an (index null) oder ersetzt den am Index; bei Namenswechsel werden Referenzen nachgezogen. */
export function upsertProvider(args: {index: number | null; policy: PolicyFile; provider: ProviderDef}): PolicyFile {
  assertNotBlank({name: args.provider.name})
  if (args.index === null) {
    if (args.policy.providers.some((provider) => provider.name === args.provider.name)) {
      throw new OperationError(`Provider ${args.provider.name} existiert bereits`)
    }
    const policy = structuredClone(args.policy)
    policy.providers.push(structuredClone(args.provider))
    return policy
  }
  assertIndex({index: args.index, length: args.policy.providers.length})
  const policy = renameProviderAt({index: args.index, policy: args.policy, to: args.provider.name})
  policy.providers[args.index] = structuredClone(args.provider)
  return policy
}

/** Löscht den Provider am Index, sofern keine Bedingung ihn verwendet. */
export function deleteProvider(args: {index: number; policy: PolicyFile}): PolicyFile {
  assertIndex({index: args.index, length: args.policy.providers.length})
  const name = args.policy.providers[args.index]?.name ?? ''
  const usages = findProviderUsages({name, policy: args.policy})
  if (usages.length > 0) {
    throw new OperationError(`Provider ${name} wird noch von ${usages.length} Recht(en) verwendet`)
  }
  const policy = structuredClone(args.policy)
  policy.providers.splice(args.index, 1)
  return policy
}

/** Legt ein Recht an (index null: anhängen) oder ersetzt das am Index; der Name muss unter den übrigen eindeutig sein. */
export function upsertRight(args: {index: number | null; policy: PolicyFile; right: RightDef}): PolicyFile {
  assertNotBlank({name: args.right.name})
  if (args.index !== null) {
    assertIndex({index: args.index, length: args.policy.rights.length})
  }
  if (args.policy.rights.some((right, index) => index !== args.index && right.name === args.right.name)) {
    throw new OperationError(`Recht ${args.right.name} existiert bereits`)
  }
  const policy = structuredClone(args.policy)
  if (args.index === null) {
    policy.rights.push(structuredClone(args.right))
  } else {
    policy.rights[args.index] = structuredClone(args.right)
  }
  return policy
}

/** Löscht das Recht am Index. */
export function deleteRight(args: {index: number; policy: PolicyFile}): PolicyFile {
  assertIndex({index: args.index, length: args.policy.rights.length})
  const policy = structuredClone(args.policy)
  policy.rights.splice(args.index, 1)
  return policy
}

/** Entfernt das Recht an `from` und fügt es an `to` wieder ein. */
export function moveRight(args: {from: number; policy: PolicyFile; to: number}): PolicyFile {
  assertIndex({index: args.from, length: args.policy.rights.length})
  assertIndex({index: args.to, length: args.policy.rights.length})
  const policy = structuredClone(args.policy)
  const [moved] = policy.rights.splice(args.from, 1)
  policy.rights.splice(args.to, 0, moved as RightDef)
  return policy
}
