import {expect} from 'chai'
import {readFileSync} from 'node:fs'
import {emptyPolicy, parsePolicy} from '../../../src/model/parse.ts'
import {serializePolicy} from '../../../src/model/serialize.ts'

function roundTrip(file: string): {actual: string; expected: string} {
  const expected = readFileSync(file, 'utf8')
  const result = parsePolicy({text: expected})
  if (!result.ok) throw new Error(result.error)
  return {actual: serializePolicy({policy: result.policy}), expected}
}

function expectIdentical(file: string): void {
  const {actual, expected} = roundTrip(file)
  if (actual === expected) return
  const exp = expected.split('\n')
  const act = actual.split('\n')
  const index = exp.findIndex((line, i) => line !== act[i])
  const line = index === -1 ? Math.min(exp.length, act.length) : index
  expect.fail(`Zeile ${line + 1} weicht ab\nerwartet: ${exp[line]}\nerhalten: ${act[line]}`)
}

describe('serializePolicy', () => {
  it('Erfolg: produktive Datei bleibt byte-identisch', () => {
    expectIdentical('test/fixtures/policy-prod.json')
  })

  it('Erfolg: Test-Datei bleibt byte-identisch', () => {
    expectIdentical('test/fixtures/policy-test.json')
  })

  it('Erfolg: Recht ohne Bedingung lässt condition weg', () => {
    const text = serializePolicy({
      policy: {
        channels: ['A'],
        providers: [],
        rights: [{channels: ['A'], description: 'd', name: 'R', roles: ['SYSTEM']}],
      },
    })
    expect(text).to.not.contain('condition')
    expect(text).to.contain('"roles": ["SYSTEM"]')
  })

  it('Erfolg: leere Konfiguration', () => {
    expect(serializePolicy({policy: emptyPolicy()})).to.equal(
      '{\n  "channels": [],\n  "providers": [],\n  "rights": []\n}\n',
    )
  })

  it('Erfolg: leere Bedingungsliste steht inline', () => {
    const text = serializePolicy({
      policy: {
        channels: [],
        providers: [],
        rights: [{channels: [], condition: {conditions: [], operator: 'AND'}, description: 'd', name: 'R', roles: []}],
      },
    })
    expect(text).to.contain('"condition": {"operator": "AND", "conditions": []}')
  })

  it('Erfolg: lässt nicht gesetzte optionale Provider-Felder weg und behält leere params', () => {
    const text = serializePolicy({
      policy: {channels: [], providers: [{className: 'X', name: 'p', params: []}], rights: []},
    })
    expect(text).to.not.contain('negation')
    expect(text).to.not.contain('description')
    expect(text).to.contain('"params": []')
  })

  it('Erfolg: verschachtelte Bedingung wird mehrzeilig geschrieben', () => {
    const text = serializePolicy({
      policy: {
        channels: [],
        providers: [],
        rights: [
          {
            channels: [],
            condition: {
              conditions: ['a', {conditions: ['b', {conditions: ['c'], operator: 'OR'}], operator: 'OR'}],
              operator: 'AND',
            },
            description: 'd',
            name: 'R',
            roles: [],
          },
        ],
      },
    })
    const result = parsePolicy({text})
    expect(result.ok).to.equal(true)
    expect(text).to.contain('          {\n            "operator": "OR",')
  })
})
