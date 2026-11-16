import {readFileSync} from 'node:fs'
import {flattenPolicy} from '../src/model/flatten.ts'
import {parsePolicy} from '../src/model/parse.ts'
import type {ConditionNode} from '../src/model/PolicyTypes.ts'

const MAX_EXHAUSTIVE = 20
const SAMPLES = 200_000

/** Wertet den Bedingungsbaum für eine Belegung der Provider (true/false) aus. */
function evaluate(node: ConditionNode, values: Map<string, boolean>): boolean {
  if (typeof node === 'string') {
    return values.get(node) ?? false
  }
  const results = node.conditions.map((child) => evaluate(child, values))
  return node.operator === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

function collect(node: ConditionNode, into: Set<string>): void {
  if (typeof node === 'string') {
    into.add(node)
    return
  }
  node.conditions.forEach((child) => collect(child, into))
}

const path = process.argv[2]
if (path === undefined) {
  console.error('Aufruf: npx tsx scripts/verify-flatten.ts <policy.json>')
  process.exit(2)
}
const parsed = parsePolicy({text: readFileSync(path, 'utf8')})
if (!parsed.ok) {
  console.error(`Datei nicht lesbar: ${parsed.error}`)
  process.exit(2)
}
const before = parsed.policy
const after = flattenPolicy({policy: before})
let failures = 0
let changed = 0

before.rights.forEach((right, index) => {
  const flat = after.rights[index]
  if (flat === undefined || right.condition === undefined || flat.condition === undefined) {
    return
  }
  if (flat.condition !== right.condition && JSON.stringify(flat.condition) !== JSON.stringify(right.condition)) {
    changed++
  }
  const names = new Set<string>()
  collect(right.condition, names)
  const list = [...names]
  const exhaustive = list.length <= MAX_EXHAUSTIVE
  const total = exhaustive ? 2 ** list.length : SAMPLES
  for (let i = 0; i < total; i++) {
    const values = new Map(
      list.map((name, bit) => [name, exhaustive ? ((i >> bit) & 1) === 1 : Math.random() < 0.5] as const),
    )
    if (evaluate(right.condition, values) !== evaluate(flat.condition, values)) {
      failures++
      console.error(`ABWEICHUNG in Recht ${right.name}: ${JSON.stringify(Object.fromEntries(values))}`)
      return
    }
  }
  if (!exhaustive) {
    console.warn(`Hinweis: ${right.name} hat ${list.length} Provider, nur Stichprobe geprüft`)
  }
})

const sameOthers =
  JSON.stringify({...before, rights: before.rights.map((r) => ({...r, condition: 0}))}) ===
  JSON.stringify({...after, rights: after.rights.map((r) => ({...r, condition: 0}))})
if (!sameOthers) {
  failures++
  console.error('ABWEICHUNG: Felder außerhalb von condition wurden verändert')
}
console.log(`${before.rights.length} Rechte geprüft, ${changed} geglättet, ${failures} Abweichungen`)
process.exit(failures === 0 ? 0 : 1)
