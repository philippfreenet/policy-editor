import {expect} from 'chai'
import {readFileSync} from 'node:fs'
import type {Finding, PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {parsePolicy} from '../../../src/model/parse.ts'
import {validatePolicy} from '../../../src/model/validate.ts'

/** Liefert eine frische, gültige Policy; Tests verändern genau eine Stelle. */
function basePolicy(): PolicyFile {
  return {
    channels: ['A', 'B'],
    providers: [
      {className: 'MarkProvider', name: 'p1', negation: false},
      {className: 'MNPProvider', name: 'p2', negation: false},
    ],
    rights: [
      {
        channels: ['A'],
        condition: {conditions: ['p1'], operator: 'AND'},
        description: 'd',
        name: 'r1',
        roles: ['SYSTEM'],
      },
      {channels: ['B'], description: 'd', name: 'r2', roles: ['PRODUCT_OWNER']},
    ],
  }
}

/** Wendet die Änderung auf eine gültige Policy an und liefert die Befunde. */
function run(args: {mutate: (policy: PolicyFile) => void}): Finding[] {
  const policy = basePolicy()
  args.mutate(policy)
  return validatePolicy({policy})
}

function error(args: {message: string; path: string}): Finding {
  return {message: args.message, path: args.path, severity: 'error'}
}

function warning(args: {message: string; path: string}): Finding {
  return {message: args.message, path: args.path, severity: 'warning'}
}

function loadFixture(args: {file: string}): PolicyFile {
  const result = parsePolicy({text: readFileSync(args.file, 'utf8')})
  if (!result.ok) throw new Error(result.error)
  return result.policy
}

describe('validatePolicy', () => {
  it('Erfolg: gültige Basis-Policy ist fehlerfrei', () => {
    expect(run({mutate: () => {}})).to.deep.equal([])
  })

  it('Erfolg: produktive und Test-Datei sind fehlerfrei', () => {
    for (const file of ['test/fixtures/policy-prod.json', 'test/fixtures/policy-test.json']) {
      const findings = validatePolicy({policy: loadFixture({file})})
      expect(
        findings.filter((f) => f.severity === 'error'),
        file,
      ).to.deep.equal([])
    }
  })

  it('Fehlschlag: meldet leere providers', () => {
    expect(run({mutate: (p) => (p.providers = [])}).filter((f) => f.path === 'providers')).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: providers', path: 'providers'}),
    ])
  })

  it('Fehlschlag: meldet leere rights', () => {
    expect(run({mutate: (p) => (p.rights = [])})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: rights', path: 'rights'}),
    ])
  })

  it('Fehlschlag: meldet leere channels', () => {
    const findings = run({mutate: (p) => (p.channels = [])})
    expect(findings[0]).to.deep.equal(error({message: 'Pflichtfeld fehlt oder ist leer: channels', path: 'channels'}))
  })

  it('Fehlschlag: meldet leeren Channel-Eintrag', () => {
    expect(run({mutate: (p) => (p.channels[1] = ' ')})[0]).to.deep.equal(
      error({message: 'Pflichtfeld fehlt oder ist leer: channels', path: 'channels[1]'}),
    )
  })

  it('Fehlschlag: meldet doppelten Channel am zweiten Vorkommen', () => {
    expect(run({mutate: (p) => (p.channels[1] = 'A')})[0]).to.deep.equal(
      error({message: 'Doppelter Eintrag in channels: A', path: 'channels[1]'}),
    )
  })

  it('Fehlschlag: meldet leeren Provider-Namen', () => {
    expect(run({mutate: (p) => (p.providers[1].name = '')})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: name eines Providers', path: 'providers[1].name'}),
    ])
  })

  it('Fehlschlag: meldet doppelten Provider-Namen', () => {
    expect(run({mutate: (p) => (p.providers[1].name = 'p1')})).to.deep.equal([
      error({message: 'Doppelter Provider-Name: p1', path: 'providers[1].name'}),
    ])
  })

  it('Fehlschlag: meldet leeren className', () => {
    expect(run({mutate: (p) => (p.providers[1].className = '')})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: className von Provider p2', path: 'providers[1].className'}),
    ])
  })

  it('Fehlschlag: meldet unbekannte Provider-Klasse', () => {
    expect(run({mutate: (p) => (p.providers[1].className = 'FooProvider')})).to.deep.equal([
      error({message: 'Unbekannte Provider-Klasse: FooProvider', path: 'providers[1].className'}),
    ])
  })

  it('Fehlschlag: meldet fehlende negation', () => {
    expect(run({mutate: (p) => delete p.providers[1].negation})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt: negation von Provider p2', path: 'providers[1].negation'}),
    ])
  })

  it('Fehlschlag: meldet leeren Parameternamen', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: '', values: ['a']}])})).to.deep.equal([
      error({
        message: 'Pflichtfeld fehlt oder ist leer: Parametername von Provider p2',
        path: 'providers[1].params[0].name',
      }),
    ])
  })

  it('Fehlschlag: meldet doppelten Parameter', () => {
    const findings = run({
      mutate: (p) =>
        (p.providers[1].params = [
          {name: 'x', values: ['a']},
          {name: 'x', values: ['b']},
        ]),
    })
    expect(findings).to.deep.equal([error({message: 'Doppelter Parameter: p2.x', path: 'providers[1].params[1].name'})])
  })

  it('Fehlschlag: meldet Nicht-Ganzzahl als Parameterwert', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: 'x', values: [1, 1.5]}])})).to.deep.include(
      error({
        message: 'Parameterwert muss eine Ganzzahl im Long-Bereich sein: p2.x',
        path: 'providers[1].params[0].values[1]',
      }),
    )
  })

  it('Fehlschlag: meldet Zahl außerhalb des sicheren Ganzzahlbereichs', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: 'x', values: [1e20]}])})).to.deep.equal([
      error({
        message: 'Parameterwert muss eine Ganzzahl im Long-Bereich sein: p2.x',
        path: 'providers[1].params[0].values[0]',
      }),
    ])
  })

  it('Fehlschlag: warnt bei Parameter ohne Werte', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: 'x', values: []}])})).to.deep.equal([
      warning({message: 'Parameter p2.x hat keine Werte', path: 'providers[1].params[0].values'}),
    ])
  })

  it('Fehlschlag: warnt bei gemischten Wertetypen', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: 'x', values: ['a', 2]}])})).to.deep.equal([
      warning({message: 'Parameter p2.x mischt Wertetypen', path: 'providers[1].params[0].values'}),
    ])
  })

  it('Erfolg: einheitliche Wertetypen erzeugen keine Warnung', () => {
    expect(run({mutate: (p) => (p.providers[1].params = [{name: 'x', values: [1, 2]}])})).to.deep.equal([])
  })

  it('Fehlschlag: meldet leeren Rechte-Namen', () => {
    expect(run({mutate: (p) => (p.rights[1].name = '')})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: name eines Rechts', path: 'rights[1].name'}),
    ])
  })

  it('Fehlschlag: meldet doppelten Rechte-Namen', () => {
    expect(run({mutate: (p) => (p.rights[1].name = 'r1')})).to.deep.equal([
      error({message: 'Doppelter Rechte-Name: r1', path: 'rights[1].name'}),
    ])
  })

  it('Fehlschlag: meldet leere description', () => {
    expect(run({mutate: (p) => (p.rights[1].description = '')})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: description von Recht r2', path: 'rights[1].description'}),
    ])
  })

  it('Fehlschlag: meldet leere roles', () => {
    expect(run({mutate: (p) => (p.rights[1].roles = [])})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: roles von Recht r2', path: 'rights[1].roles'}),
    ])
  })

  it('Fehlschlag: meldet leeren Rollen-Eintrag', () => {
    expect(run({mutate: (p) => (p.rights[1].roles = ['SYSTEM', ''])})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: roles von Recht r2', path: 'rights[1].roles[1]'}),
    ])
  })

  it('Fehlschlag: meldet doppelte Rolle', () => {
    expect(run({mutate: (p) => (p.rights[1].roles = ['SYSTEM', 'SYSTEM'])})).to.deep.equal([
      error({message: 'Doppelter Eintrag in roles von Recht r2: SYSTEM', path: 'rights[1].roles[1]'}),
    ])
  })

  it('Fehlschlag: meldet unbekannte Rolle', () => {
    expect(run({mutate: (p) => (p.rights[1].roles = ['BOSS'])})).to.deep.equal([
      error({message: 'Unbekannte Rolle in Recht r2: BOSS', path: 'rights[1].roles[0]'}),
    ])
  })

  it('Fehlschlag: meldet leere channels eines Rechts', () => {
    expect(run({mutate: (p) => (p.rights[1].channels = [])})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: channels von Recht r2', path: 'rights[1].channels'}),
    ])
  })

  it('Fehlschlag: meldet leeren Channel-Eintrag eines Rechts', () => {
    expect(run({mutate: (p) => (p.rights[1].channels = ['A', ' '])})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: channels von Recht r2', path: 'rights[1].channels[1]'}),
    ])
  })

  it('Fehlschlag: meldet doppelten Channel eines Rechts', () => {
    expect(run({mutate: (p) => (p.rights[1].channels = ['A', 'A'])})).to.deep.equal([
      error({message: 'Doppelter Eintrag in channels von Recht r2: A', path: 'rights[1].channels[1]'}),
    ])
  })

  it('Fehlschlag: meldet unbekannten Channel eines Rechts', () => {
    expect(run({mutate: (p) => (p.rights[1].channels = ['Z'])})).to.deep.equal([
      error({message: 'Unbekannter Channel in Recht r2: Z', path: 'rights[1].channels[0]'}),
    ])
  })

  it('Fehlschlag: meldet ungültigen operator', () => {
    expect(run({mutate: (p) => (p.rights[0].condition!.operator = 'XOR')})).to.deep.equal([
      error({message: 'Ungültiger operator in Recht r1: XOR', path: 'rights[0].condition.operator'}),
    ])
  })

  it('Fehlschlag: meldet ungültigen operator in verschachtelter Gruppe der Tiefe 3', () => {
    const findings = run({
      mutate: (p) =>
        (p.rights[0].condition = {
          conditions: ['p1', {conditions: [{conditions: ['p2'], operator: 'NAND'}], operator: 'AND'}],
          operator: 'AND',
        }),
    })
    expect(findings).to.deep.equal([
      error({
        message: 'Ungültiger operator in Recht r1: NAND',
        path: 'rights[0].condition.conditions[1].conditions[0].operator',
      }),
    ])
  })

  it('Fehlschlag: meldet leeren operator', () => {
    expect(run({mutate: (p) => (p.rights[0].condition!.operator = '')})).to.deep.equal([
      error({message: 'Pflichtfeld fehlt oder ist leer: operator in Recht r1', path: 'rights[0].condition.operator'}),
    ])
  })

  it('Fehlschlag: meldet leere conditions', () => {
    expect(run({mutate: (p) => (p.rights[0].condition!.conditions = [])})).to.deep.equal([
      error({
        message: 'Pflichtfeld fehlt oder ist leer: conditions in Recht r1',
        path: 'rights[0].condition.conditions',
      }),
    ])
  })

  it('Fehlschlag: meldet unbekannten Provider in Bedingung', () => {
    expect(run({mutate: (p) => (p.rights[0].condition!.conditions = ['p1', 'nope'])})).to.deep.equal([
      error({
        message: 'Unbekannter Provider in Bedingung von Recht r1: nope',
        path: 'rights[0].condition.conditions[1]',
      }),
    ])
  })

  it('Fehlschlag: meldet leere Provider-Referenz', () => {
    expect(run({mutate: (p) => (p.rights[0].condition!.conditions = [''])})).to.deep.equal([
      error({
        message: 'Pflichtfeld fehlt oder ist leer: Provider-Referenz in Recht r1',
        path: 'rights[0].condition.conditions[0]',
      }),
    ])
  })

  it('Fehlschlag: meldet unbekannten Provider in dritter Verschachtelungsebene', () => {
    const findings = run({
      mutate: (p) =>
        (p.rights[0].condition = {
          conditions: [
            'p1',
            {
              conditions: [{conditions: ['missing'], operator: 'OR'}],
              operator: 'AND',
            },
          ],
          operator: 'AND',
        }),
    })
    expect(findings).to.deep.equal([
      error({
        message: 'Unbekannter Provider in Bedingung von Recht r1: missing',
        path: 'rights[0].condition.conditions[1].conditions[0].conditions[0]',
      }),
    ])
  })

  it('Fehlschlag: sammelt alle Befunde in Dateireihenfolge', () => {
    const findings = run({
      mutate: (p) => {
        p.rights[1].roles = ['BOSS']
        p.providers[0].className = 'X'
        p.channels[1] = 'A'
        p.rights[1].channels = ['A']
      },
    })
    expect(findings.map((f) => f.path)).to.deep.equal(['channels[1]', 'providers[0].className', 'rights[1].roles[0]'])
  })
})
