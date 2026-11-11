import {expect} from 'chai'
import {readFileSync} from 'node:fs'
import {PROVIDER_CLASSES, USER_ROLES} from '../../../src/constants.ts'
import {emptyPolicy, parsePolicy} from '../../../src/model/parse.ts'

function parseOk(text: string): Extract<ReturnType<typeof parsePolicy>, {ok: true}> {
  const result = parsePolicy({text})
  if (!result.ok) throw new Error(result.error)
  return result
}

describe('parsePolicy', () => {
  it('Erfolg: liest die produktive policy.json', () => {
    const result = parseOk(readFileSync('test/fixtures/policy-prod.json', 'utf8'))
    expect(result.policy.channels).to.have.length(11)
    expect(result.policy.providers).to.have.length(48)
    expect(result.policy.rights).to.have.length(49)
    expect(result.findings).to.deep.equal([])
  })

  it('Fehlschlag: meldet ungültiges JSON', () => {
    const result = parsePolicy({text: '{'})
    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error).to.contain('JSON')
  })

  it('Fehlschlag: meldet eine Wurzel, die kein Objekt ist', () => {
    expect(parsePolicy({text: '[]'}).ok).to.equal(false)
  })

  it('Fehlschlag: meldet unbekanntes Feld', () => {
    const result = parseOk('{"channels":[],"providers":[],"rights":[],"extra":1}')
    expect(result.findings).to.deep.equal([{message: 'Unbekanntes Feld: extra', path: 'extra', severity: 'error'}])
  })

  it('Fehlschlag: meldet unbekannte Felder in verschachtelten Ebenen', () => {
    const result = parseOk(
      JSON.stringify({
        channels: [],
        providers: [{className: 'X', name: 'p', foo: 1, params: [{bar: 1, name: 'a', values: []}]}],
        rights: [
          {channels: [], condition: {baz: 1, conditions: [], operator: 'AND'}, description: '', name: 'r', roles: []},
        ],
      }),
    )
    expect(result.findings.map((f) => f.path)).to.have.members([
      'providers[0].foo',
      'providers[0].params[0].bar',
      'rights[0].condition.baz',
    ])
  })

  it('Fehlschlag: lädt falsche Typen so weit wie möglich', () => {
    const result = parseOk('{"channels":[],"providers":[{"name":"p","className":"X","negation":"false"}],"rights":{}}')
    expect(result.policy.rights).to.deep.equal([])
    expect(result.policy.providers[0]?.negation).to.equal(undefined)
    expect(result.findings.map((f) => f.path)).to.have.members(['rights', 'providers[0].negation'])
    for (const f of result.findings) expect(f.message).to.match(/^Falscher Typ/)
    expect(result.findings.find((f) => f.path === 'rights')?.message).to.equal(
      'Falscher Typ für rights: erwartet Liste',
    )
  })

  it('Fehlschlag: verwirft Listeneinträge des falschen Typs mit Finding', () => {
    const result = parseOk(
      JSON.stringify({
        channels: ['A', 5],
        providers: [7, {className: 'X', name: 'p', params: [{name: 'a', values: ['x', 1, true, null]}, 'z']}],
        rights: [
          {
            channels: [],
            condition: {conditions: ['a', 3], operator: 'OR'},
            description: '',
            name: 'r',
            roles: [1, 'R'],
          },
        ],
      }),
    )
    expect(result.policy.channels).to.deep.equal(['A'])
    expect(result.policy.providers).to.have.length(1)
    expect(result.policy.providers[0]?.params).to.deep.equal([{name: 'a', values: ['x', 1, true]}])
    expect(result.policy.rights[0]?.roles).to.deep.equal(['R'])
    expect(result.policy.rights[0]?.condition?.conditions).to.deep.equal(['a'])
    expect(result.findings.map((f) => f.path)).to.have.members([
      'channels[1]',
      'providers[0]',
      'providers[1].params[0].values[3]',
      'providers[1].params[1]',
      'rights[0].roles[0]',
      'rights[0].condition.conditions[1]',
    ])
    expect(result.findings.find((f) => f.path === 'providers[1].params[0].values[3]')?.message).to.equal(
      'Falscher Typ für providers[1].params[0].values[3]: erwartet Text, Zahl oder Ja/Nein',
    )
    expect(result.findings.find((f) => f.path === 'rights[0].condition.conditions[1]')?.message).to.contain(
      'Text oder Bedingung',
    )
  })

  it('Fehlschlag: meldet eine Bedingung, die kein Objekt ist, mit der Meldung des Services', () => {
    const result = parseOk(
      '{"channels":[],"providers":[],"rights":[{"name":"R1","description":"d","roles":[],"channels":[],"condition":"x"}]}',
    )
    expect(result.policy.rights[0]?.condition).to.equal(undefined)
    expect(result.findings).to.deep.equal([
      {message: 'condition muss operator und conditions enthalten: R1', path: 'rights[0].condition', severity: 'error'},
    ])
  })

  it('Erfolg: behält leere params und fehlende optionale Felder bei', () => {
    const result = parseOk(
      '{"channels":[],"providers":[{"name":"p","className":"X","params":[]},{"name":"q","className":"X"}],"rights":[]}',
    )
    expect(result.policy.providers[0]).to.deep.equal({className: 'X', name: 'p', params: []})
    expect(result.policy.providers[1]).to.deep.equal({className: 'X', name: 'q'})
    expect(result.findings).to.deep.equal([])
  })

  it('Erfolg: Bedingung mit Strings und verschachtelten Gruppen', () => {
    const condition = {
      conditions: ['a', {conditions: ['b', {conditions: ['c', 'd'], operator: 'AND'}], operator: 'OR'}],
      operator: 'AND',
    }
    const result = parseOk(
      JSON.stringify({
        channels: [],
        providers: [],
        rights: [{channels: [], condition, description: 'd', name: 'r', roles: []}],
      }),
    )
    expect(result.policy.rights[0]?.condition).to.deep.equal(condition)
    expect(result.findings).to.deep.equal([])
  })

  it('Erfolg: liefert Konstanten und leere Policy', () => {
    expect(USER_ROLES).to.have.length(5)
    expect(PROVIDER_CLASSES).to.have.length(19)
    expect(emptyPolicy()).to.deep.equal({channels: [], providers: [], rights: []})
  })
})
