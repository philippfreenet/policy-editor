import {expect} from 'chai'
import type {PolicyFile, RightDef} from '../../../../src/model/PolicyTypes.ts'
import {changedRights} from '../../../../src/ui/logic/changedRights.ts'

const right = (name: string, description = ''): RightDef => ({channels: ['A'], description, name, roles: ['S']})
const policyOf = (rights: RightDef[]): PolicyFile => ({channels: ['A'], providers: [], rights})
const original = JSON.stringify(policyOf([right('r0'), right('r1'), right('r2')]))

describe('changedRights', () => {
  it('Erfolg: ohne Original ist nichts geändert', () => {
    expect(changedRights({original: null, policy: policyOf([right('r0')])})).to.deep.equal(new Set())
  })

  it('Erfolg: unverändert geladen ergibt leer', () => {
    expect(changedRights({original, policy: JSON.parse(original) as PolicyFile})).to.deep.equal(new Set())
  })

  it('Erfolg: geänderte Beschreibung markiert genau dieses Recht', () => {
    const policy = policyOf([right('r0'), right('r1', 'neu'), right('r2')])
    expect(changedRights({original, policy})).to.deep.equal(new Set([1]))
  })

  it('Erfolg: verschobene Rechte gelten nicht als geändert', () => {
    const policy = policyOf([right('r2'), right('r0'), right('r1')])
    expect(changedRights({original, policy})).to.deep.equal(new Set())
  })

  it('Erfolg: umbenannt und neu angehängt', () => {
    const policy = policyOf([right('r0'), right('x'), right('r2'), right('neu')])
    expect(changedRights({original, policy})).to.deep.equal(new Set([1, 3]))
  })

  it('Fehlschlag: ungültiges Original ergibt leer ohne Wurf', () => {
    expect(changedRights({original: '{kaputt', policy: policyOf([right('r0')])})).to.deep.equal(new Set())
  })

  it('Fehlschlag: bei doppelten Namen ist nur das geänderte zweite Recht markiert', () => {
    const orig = JSON.stringify(policyOf([right('d'), right('d')]))
    const policy = policyOf([right('d'), right('d', 'neu')])
    expect(changedRights({original: orig, policy})).to.deep.equal(new Set([1]))
  })
})
