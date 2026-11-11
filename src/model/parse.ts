import type {
  CompositeNode,
  ConditionNode,
  Finding,
  ParamDef,
  ParseResult,
  PolicyFile,
  ProviderDef,
  RightDef,
  Scalar,
} from './PolicyTypes.ts'

type Json = Record<string, unknown>

/** Liefert eine leere Policy. */
export function emptyPolicy(): PolicyFile {
  return {channels: [], providers: [], rights: []}
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScalar(value: unknown): value is Scalar {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function join(base: string, key: string): string {
  return base === '' ? key : `${base}.${key}`
}

class Reader {
  public readonly findings: Finding[] = []

  public wrongType(args: {expected: string; path: string}): void {
    this.findings.push({
      message: `Falscher Typ für ${args.path}: erwartet ${args.expected}`,
      path: args.path,
      severity: 'error',
    })
  }

  /** Meldet jedes Feld, das nicht in known steht. */
  public checkUnknown(args: {known: readonly string[]; obj: Json; path: string}): void {
    for (const key of Object.keys(args.obj)) {
      if (!args.known.includes(key)) {
        const path = join(args.path, key)
        this.findings.push({message: `Unbekanntes Feld: ${path}`, path, severity: 'error'})
      }
    }
  }

  /** Liest ein Pflicht-Textfeld; Fallback ''. */
  public string(args: {obj: Json; key: string; path: string}): string {
    const value = args.obj[args.key]
    if (typeof value === 'string') return value
    if (value !== undefined) this.wrongType({expected: 'Text', path: join(args.path, args.key)})
    return ''
  }

  /** Liest ein optionales Textfeld; fehlt es, bleibt es undefined. */
  public optionalString(args: {obj: Json; key: string; path: string}): string | undefined {
    const value = args.obj[args.key]
    if (value === undefined) return undefined
    if (typeof value === 'string') return value
    this.wrongType({expected: 'Text', path: join(args.path, args.key)})
    return undefined
  }

  public optionalBoolean(args: {obj: Json; key: string; path: string}): boolean | undefined {
    const value = args.obj[args.key]
    if (value === undefined) return undefined
    if (typeof value === 'boolean') return value
    this.wrongType({expected: 'Ja/Nein', path: join(args.path, args.key)})
    return undefined
  }

  /** Liest eine Liste; Einträge des falschen Typs werden gemeldet und verworfen. */
  public list<T>(args: {
    obj: Json
    key: string
    path: string
    item: (value: unknown, path: string) => T | undefined
  }): T[] {
    const path = join(args.path, args.key)
    const value = args.obj[args.key]
    if (!Array.isArray(value)) {
      if (value !== undefined) this.wrongType({expected: 'Liste', path})
      return []
    }
    const result: T[] = []
    value.forEach((entry: unknown, index: number) => {
      const parsed = args.item(entry, `${path}[${index}]`)
      if (parsed !== undefined) result.push(parsed)
    })
    return result
  }

  public stringItem(value: unknown, path: string): string | undefined {
    if (typeof value === 'string') return value
    this.wrongType({expected: 'Text', path})
    return undefined
  }

  public condition(value: unknown, path: string): ConditionNode | undefined {
    if (typeof value === 'string') return value
    if (isObject(value)) return this.composite(value, path)
    this.wrongType({expected: 'Text oder Bedingung', path})
    return undefined
  }

  public composite(obj: Json, path: string): CompositeNode {
    this.checkUnknown({known: ['operator', 'conditions'], obj, path})
    return {
      conditions: this.list({
        item: (v, p) => this.condition(v, p),
        key: 'conditions',
        obj,
        path,
      }),
      operator: this.string({key: 'operator', obj, path}),
    }
  }

  public param(value: unknown, path: string): ParamDef | undefined {
    if (!isObject(value)) {
      this.wrongType({expected: 'Objekt', path})
      return undefined
    }
    this.checkUnknown({known: ['name', 'values'], obj: value, path})
    return {
      name: this.string({key: 'name', obj: value, path}),
      values: this.list<Scalar>({
        item: (v, p) => {
          if (isScalar(v)) return v
          this.wrongType({expected: 'Text, Zahl oder Ja/Nein', path: p})
          return undefined
        },
        key: 'values',
        obj: value,
        path,
      }),
    }
  }

  public provider(value: unknown, path: string): ProviderDef | undefined {
    if (!isObject(value)) {
      this.wrongType({expected: 'Objekt', path})
      return undefined
    }
    this.checkUnknown({known: ['name', 'className', 'description', 'negation', 'params'], obj: value, path})
    const provider: ProviderDef = {
      className: this.string({key: 'className', obj: value, path}),
      name: this.string({key: 'name', obj: value, path}),
    }
    const description = this.optionalString({key: 'description', obj: value, path})
    if (description !== undefined) provider.description = description
    const negation = this.optionalBoolean({key: 'negation', obj: value, path})
    if (negation !== undefined) provider.negation = negation
    if (value['params'] !== undefined) {
      provider.params = this.list({
        item: (v, p) => this.param(v, p),
        key: 'params',
        obj: value,
        path,
      })
    }
    return provider
  }

  public right(value: unknown, path: string): RightDef | undefined {
    if (!isObject(value)) {
      this.wrongType({expected: 'Objekt', path})
      return undefined
    }
    this.checkUnknown({known: ['name', 'description', 'roles', 'channels', 'condition'], obj: value, path})
    const right: RightDef = {
      channels: this.list({
        item: (v, p) => this.stringItem(v, p),
        key: 'channels',
        obj: value,
        path,
      }),
      description: this.string({key: 'description', obj: value, path}),
      name: this.string({key: 'name', obj: value, path}),
      roles: this.list({item: (v, p) => this.stringItem(v, p), key: 'roles', obj: value, path}),
    }
    const condition = value['condition']
    if (condition !== undefined) {
      const conditionPath = join(path, 'condition')
      if (isObject(condition)) {
        right.condition = this.composite(condition, conditionPath)
      } else {
        this.findings.push({
          message: `condition muss operator und conditions enthalten: ${right.name}`,
          path: conditionPath,
          severity: 'error',
        })
      }
    }
    return right
  }
}

/** Liest den Text einer policy.json so weit wie möglich und sammelt Typ- und Feldfehler als Findings. */
export function parsePolicy(args: {text: string}): ParseResult {
  let root: unknown
  try {
    root = JSON.parse(args.text)
  } catch (e) {
    return {error: `Ungültiges JSON: ${e instanceof Error ? e.message : String(e)}`, ok: false}
  }
  if (!isObject(root)) {
    return {error: 'Ungültiges JSON: Die Datei muss ein Objekt enthalten', ok: false}
  }
  const reader = new Reader()
  reader.checkUnknown({known: ['channels', 'providers', 'rights'], obj: root, path: ''})
  const policy: PolicyFile = {
    channels: reader.list({
      item: (v, p) => reader.stringItem(v, p),
      key: 'channels',
      obj: root,
      path: '',
    }),
    providers: reader.list({
      item: (v, p) => reader.provider(v, p),
      key: 'providers',
      obj: root,
      path: '',
    }),
    rights: reader.list({
      item: (v, p) => reader.right(v, p),
      key: 'rights',
      obj: root,
      path: '',
    }),
  }
  return {findings: reader.findings, ok: true, policy}
}
