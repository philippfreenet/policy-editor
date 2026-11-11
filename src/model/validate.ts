import {PROVIDER_CLASSES, USER_ROLES} from '../constants.ts'
import type {CompositeNode, Finding, PolicyFile, ProviderDef, RightDef} from './PolicyTypes.ts'

/** Prüft, ob ein Text leer oder nur aus Leerzeichen besteht (entspricht `String.isBlank` im Service). */
function isBlank(args: {value: string | undefined}): boolean {
  return args.value === undefined || args.value.trim().length === 0
}

/** Erzeugt einen Fehlerbefund. */
function error(args: {message: string; path: string}): Finding {
  return {message: args.message, path: args.path, severity: 'error'}
}

/**
 * Prüft eine Liste eindeutiger, nicht leerer Texte (Java: `requiredUniqueStrings` plus `requireKnown`).
 * Gemeldet werden leere Liste, leere Einträge, Duplikate (ab dem zweiten Vorkommen) und unbekannte Einträge.
 */
function checkStringList(args: {
  duplicateMessage: (value: string) => string
  field: string
  findings: Finding[]
  known?: ReadonlySet<string>
  path: string
  unknownMessage?: (value: string) => string
  values: string[]
}): void {
  const emptyMessage = `Pflichtfeld fehlt oder ist leer: ${args.field}`
  if (args.values.length === 0) {
    args.findings.push(error({message: emptyMessage, path: args.path}))
    return
  }
  const seen = new Set<string>()
  args.values.forEach((value, index) => {
    const path = `${args.path}[${index}]`
    if (isBlank({value})) {
      args.findings.push(error({message: emptyMessage, path}))
    } else if (seen.has(value)) {
      args.findings.push(error({message: args.duplicateMessage(value), path}))
    } else {
      seen.add(value)
      if (args.known !== undefined && args.unknownMessage !== undefined && !args.known.has(value)) {
        args.findings.push(error({message: args.unknownMessage(value), path}))
      }
    }
  })
}

/** Prüft die Parameter eines Providers (Namen, Duplikate, Ganzzahlen, Warnungen zu den Werten). */
function validateParams(args: {findings: Finding[]; path: string; provider: ProviderDef; providerName: string}): void {
  const names = new Set<string>()
  ;(args.provider.params ?? []).forEach((param, index) => {
    const path = `${args.path}.params[${index}]`
    if (isBlank({value: param.name})) {
      args.findings.push(
        error({
          message: `Pflichtfeld fehlt oder ist leer: Parametername von Provider ${args.providerName}`,
          path: `${path}.name`,
        }),
      )
      return
    }
    const label = `${args.providerName}.${param.name}`
    if (names.has(param.name)) {
      args.findings.push(error({message: `Doppelter Parameter: ${label}`, path: `${path}.name`}))
      return
    }
    names.add(param.name)
    param.values.forEach((value, valueIndex) => {
      /*
       * Der Service verlangt Ganzzahlen im Long-Bereich. JavaScript-Zahlen sind Doubles und bilden den
       * vollen Long-Bereich nicht exakt ab; als Näherung gilt der sichere Ganzzahlbereich (±2^53−1).
       */
      if (typeof value === 'number' && !Number.isSafeInteger(value)) {
        args.findings.push(
          error({
            message: `Parameterwert muss eine Ganzzahl im Long-Bereich sein: ${label}`,
            path: `${path}.values[${valueIndex}]`,
          }),
        )
      }
    })
    if (param.values.length === 0) {
      args.findings.push({message: `Parameter ${label} hat keine Werte`, path: `${path}.values`, severity: 'warning'})
    } else if (new Set(param.values.map((value) => typeof value)).size > 1) {
      args.findings.push({message: `Parameter ${label} mischt Wertetypen`, path: `${path}.values`, severity: 'warning'})
    }
  })
}

/** Prüft die Provider-Liste in Dateireihenfolge und liefert die Menge der bekannten Provider-Namen. */
function validateProviders(args: {findings: Finding[]; providers: ProviderDef[]}): Set<string> {
  const names = new Set<string>()
  args.providers.forEach((provider, index) => {
    const path = `providers[${index}]`
    let name = ''
    if (isBlank({value: provider.name})) {
      args.findings.push(
        error({message: 'Pflichtfeld fehlt oder ist leer: name eines Providers', path: `${path}.name`}),
      )
    } else {
      name = provider.name
      if (names.has(name)) {
        args.findings.push(error({message: `Doppelter Provider-Name: ${name}`, path: `${path}.name`}))
      }
      names.add(name)
    }
    if (isBlank({value: provider.className})) {
      args.findings.push(
        error({
          message: `Pflichtfeld fehlt oder ist leer: className von Provider ${name}`,
          path: `${path}.className`,
        }),
      )
    } else if (!PROVIDER_CLASSES.includes(provider.className)) {
      args.findings.push(
        error({message: `Unbekannte Provider-Klasse: ${provider.className}`, path: `${path}.className`}),
      )
    }
    if (provider.negation === undefined) {
      args.findings.push(error({message: `Pflichtfeld fehlt: negation von Provider ${name}`, path: `${path}.negation`}))
    }
    validateParams({findings: args.findings, path, provider, providerName: name})
  })
  return names
}

/** Prüft eine verschachtelte Bedingung rekursiv (Operator, Kinder, Provider-Referenzen). */
function validateComposite(args: {
  composite: CompositeNode
  findings: Finding[]
  path: string
  providerNames: ReadonlySet<string>
  rightName: string
}): void {
  const {composite, findings, path, providerNames, rightName} = args
  if (isBlank({value: composite.operator})) {
    findings.push(
      error({message: `Pflichtfeld fehlt oder ist leer: operator in Recht ${rightName}`, path: `${path}.operator`}),
    )
  } else if (composite.operator !== 'AND' && composite.operator !== 'OR') {
    findings.push(
      error({message: `Ungültiger operator in Recht ${rightName}: ${composite.operator}`, path: `${path}.operator`}),
    )
  }
  if (composite.conditions.length === 0) {
    findings.push(
      error({
        message: `Pflichtfeld fehlt oder ist leer: conditions in Recht ${rightName}`,
        path: `${path}.conditions`,
      }),
    )
    return
  }
  composite.conditions.forEach((child, index) => {
    const childPath = `${path}.conditions[${index}]`
    if (typeof child !== 'string') {
      validateComposite({composite: child, findings, path: childPath, providerNames, rightName})
    } else if (isBlank({value: child})) {
      findings.push(
        error({message: `Pflichtfeld fehlt oder ist leer: Provider-Referenz in Recht ${rightName}`, path: childPath}),
      )
    } else if (!providerNames.has(child)) {
      findings.push(
        error({message: `Unbekannter Provider in Bedingung von Recht ${rightName}: ${child}`, path: childPath}),
      )
    }
  })
}

/** Prüft die Rechte in Dateireihenfolge. */
function validateRights(args: {
  channels: ReadonlySet<string>
  findings: Finding[]
  providerNames: ReadonlySet<string>
  rights: RightDef[]
}): void {
  const names = new Set<string>()
  args.rights.forEach((right: RightDef, index) => {
    const path = `rights[${index}]`
    let name = ''
    if (isBlank({value: right.name})) {
      args.findings.push(error({message: 'Pflichtfeld fehlt oder ist leer: name eines Rechts', path: `${path}.name`}))
    } else {
      name = right.name
      if (names.has(name)) {
        args.findings.push(error({message: `Doppelter Rechte-Name: ${name}`, path: `${path}.name`}))
      }
      names.add(name)
    }
    if (isBlank({value: right.description})) {
      args.findings.push(
        error({
          message: `Pflichtfeld fehlt oder ist leer: description von Recht ${name}`,
          path: `${path}.description`,
        }),
      )
    }
    checkStringList({
      duplicateMessage: (value) => `Doppelter Eintrag in roles von Recht ${name}: ${value}`,
      field: `roles von Recht ${name}`,
      findings: args.findings,
      known: new Set(USER_ROLES),
      path: `${path}.roles`,
      unknownMessage: (value) => `Unbekannte Rolle in Recht ${name}: ${value}`,
      values: right.roles,
    })
    checkStringList({
      duplicateMessage: (value) => `Doppelter Eintrag in channels von Recht ${name}: ${value}`,
      field: `channels von Recht ${name}`,
      findings: args.findings,
      known: args.channels,
      path: `${path}.channels`,
      unknownMessage: (value) => `Unbekannter Channel in Recht ${name}: ${value}`,
      values: right.channels,
    })
    if (right.condition !== undefined) {
      validateComposite({
        composite: right.condition,
        findings: args.findings,
        path: `${path}.condition`,
        providerNames: args.providerNames,
        rightName: name,
      })
    }
  })
}

/**
 * Prüft eine Policy nach den Startregeln des policy-service (`DatabaseService`).
 * Anders als der Service, der beim ersten Fehler abbricht, werden alle Befunde in Dateireihenfolge geliefert.
 */
export function validatePolicy(args: {policy: PolicyFile}): Finding[] {
  const {policy} = args
  const findings: Finding[] = []
  if (policy.providers.length === 0) {
    findings.push(error({message: 'Pflichtfeld fehlt oder ist leer: providers', path: 'providers'}))
  }
  if (policy.rights.length === 0) {
    findings.push(error({message: 'Pflichtfeld fehlt oder ist leer: rights', path: 'rights'}))
  }
  checkStringList({
    duplicateMessage: (value) => `Doppelter Eintrag in channels: ${value}`,
    field: 'channels',
    findings,
    path: 'channels',
    values: policy.channels,
  })
  const providerNames = validateProviders({findings, providers: policy.providers})
  validateRights({channels: new Set(policy.channels), findings, providerNames, rights: policy.rights})
  return findings
}
