import type {Scalar} from '../model/PolicyTypes.ts'

/** Wertetyp eines Parameters. */
export type ValueType = 'boolean' | 'number' | 'string'

/** Leitet den Typ vom ersten Wert ab; eine leere Liste gilt als Text. */
export function valueType(args: {values: readonly Scalar[]}): ValueType {
  const first = args.values[0]
  return typeof first === 'number' ? 'number' : typeof first === 'boolean' ? 'boolean' : 'string'
}

/** Wandelt einen Wert in eine Ganzzahl; undefined, wenn das nicht verlustfrei möglich ist. */
function toNumber(value: Scalar): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : undefined
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const n = Number(value.trim())
    return Number.isSafeInteger(n) ? n : undefined
  }
  return undefined
}

/** Wandelt einen Wert in einen Boolean; nur true/false (ohne Beachtung der Groß-/Kleinschreibung) sind gültig. */
function toBoolean(value: Scalar): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text === 'true' ? true : text === 'false' ? false : undefined
}

/** Wandelt alle Werte in den Zieltyp; nicht umwandelbare Werte entfallen. */
export function convertValues(args: {target: ValueType; values: readonly Scalar[]}): Scalar[] {
  if (args.target === 'string') {
    return args.values.map((v) => String(v))
  }
  const convert = args.target === 'number' ? toNumber : toBoolean
  const result: Scalar[] = []
  for (const value of args.values) {
    const converted = convert(value)
    if (converted !== undefined) {
      result.push(converted)
    }
  }
  return result
}

/** Liefert die Werte (als Text), die beim Wechsel auf den Zieltyp verloren gehen würden. */
export function droppedValues(args: {target: ValueType; values: readonly Scalar[]}): string[] {
  if (args.target === 'string') {
    return []
  }
  const convert = args.target === 'number' ? toNumber : toBoolean
  return args.values.filter((value) => convert(value) === undefined).map((value) => String(value))
}
