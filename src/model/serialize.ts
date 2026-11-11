import type {CompositeNode, ConditionNode, ParamDef, PolicyFile, ProviderDef, RightDef} from './PolicyTypes.ts'

const INDENT = '  '

/** Schreibt eine Liste von Skalaren in einer Zeile. */
function inlineArray(args: {values: unknown[]}): string {
  return `[${args.values.map((value) => JSON.stringify(value)).join(', ')}]`
}

/** Schreibt eine Liste mit einem Eintrag pro Zeile; leere Liste als `[]`. */
function multiLineList(args: {depth: number; items: string[]}): string {
  if (args.items.length === 0) return '[]'
  const pad = INDENT.repeat(args.depth + 1)
  return `[\n${args.items.map((item) => pad + item).join(',\n')}\n${INDENT.repeat(args.depth)}]`
}

/** Schreibt ein Objekt mit einem Schlüssel pro Zeile. */
function multiLineObject(args: {depth: number; entries: [string, string][]}): string {
  const pad = INDENT.repeat(args.depth + 1)
  const lines = args.entries.map(([key, value]) => `${pad}${JSON.stringify(key)}: ${value}`)
  return `{\n${lines.join(',\n')}\n${INDENT.repeat(args.depth)}}`
}

/** Schreibt einen Parameter inline. */
function serializeParam(args: {param: ParamDef}): string {
  return `{"name": ${JSON.stringify(args.param.name)}, "values": ${inlineArray({values: args.param.values})}}`
}

/** Schreibt einen Provider mehrzeilig. */
function serializeProvider(args: {depth: number; provider: ProviderDef}): string {
  const {provider} = args
  const entries: [string, string][] = [
    ['name', JSON.stringify(provider.name)],
    ['className', JSON.stringify(provider.className)],
  ]
  if (provider.description !== undefined) entries.push(['description', JSON.stringify(provider.description)])
  if (provider.negation !== undefined) entries.push(['negation', JSON.stringify(provider.negation)])
  if (provider.params !== undefined) {
    entries.push([
      'params',
      multiLineList({depth: args.depth + 1, items: provider.params.map((param) => serializeParam({param}))}),
    ])
  }
  return multiLineObject({depth: args.depth, entries})
}

/** Schreibt eine Bedingung inline (nur String-Kinder) oder mehrzeilig. */
function serializeCondition(args: {depth: number; node: CompositeNode}): string {
  const {node} = args
  if (node.conditions.every((child) => typeof child === 'string')) {
    return `{"operator": ${JSON.stringify(node.operator)}, "conditions": ${inlineArray({values: node.conditions})}}`
  }
  const children = node.conditions.map((child: ConditionNode) =>
    typeof child === 'string' ? JSON.stringify(child) : serializeCondition({depth: args.depth + 2, node: child}),
  )
  return multiLineObject({
    depth: args.depth,
    entries: [
      ['operator', JSON.stringify(node.operator)],
      ['conditions', multiLineList({depth: args.depth + 1, items: children})],
    ],
  })
}

/** Schreibt ein Recht mehrzeilig. */
function serializeRight(args: {depth: number; right: RightDef}): string {
  const {right} = args
  const entries: [string, string][] = [
    ['name', JSON.stringify(right.name)],
    ['description', JSON.stringify(right.description)],
    ['roles', inlineArray({values: right.roles})],
    ['channels', inlineArray({values: right.channels})],
  ]
  if (right.condition !== undefined) {
    entries.push(['condition', serializeCondition({depth: args.depth + 1, node: right.condition})])
  }
  return multiLineObject({depth: args.depth, entries})
}

/**
 * Schreibt das Modell im Stil der bestehenden policy.json: 2 Leerzeichen Einrückung, genau ein abschließender
 * Zeilenumbruch. Wurzel, Provider, Rechte sowie die Listen providers/rights/params sind mehrzeilig, Listen aus
 * Skalaren und Parameter-Objekte stehen inline. Eine Bedingung steht inline, wenn alle Kinder Strings sind
 * (auch bei leerer Liste), sonst mehrzeilig mit je einem Kind pro Zeile. Nicht gesetzte optionale Felder entfallen.
 */
export function serializePolicy(args: {policy: PolicyFile}): string {
  const {policy} = args
  const body = multiLineObject({
    depth: 0,
    entries: [
      ['channels', inlineArray({values: policy.channels})],
      [
        'providers',
        multiLineList({depth: 1, items: policy.providers.map((provider) => serializeProvider({depth: 2, provider}))}),
      ],
      ['rights', multiLineList({depth: 1, items: policy.rights.map((right) => serializeRight({depth: 2, right}))})],
    ],
  })
  return `${body}\n`
}
