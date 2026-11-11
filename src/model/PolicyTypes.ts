export type Scalar = boolean | number | string

export interface ParamDef {
  name: string
  values: Scalar[]
}

export interface ProviderDef {
  className: string
  description?: string
  name: string
  negation?: boolean
  params?: ParamDef[]
}

export type Operator = 'AND' | 'OR'

export type ConditionNode = CompositeNode | string

/** Der Operator bleibt ein string, damit ungültige Werte geladen und von der Validierung gemeldet werden. */
export interface CompositeNode {
  conditions: ConditionNode[]
  operator: string
}

export interface RightDef {
  channels: string[]
  condition?: CompositeNode
  description: string
  name: string
  roles: string[]
}

export interface PolicyFile {
  channels: string[]
  providers: ProviderDef[]
  rights: RightDef[]
}

export interface Finding {
  message: string
  path: string
  severity: 'error' | 'warning'
}

export type ParseResult = {error: string; ok: false} | {findings: Finding[]; ok: true; policy: PolicyFile}
