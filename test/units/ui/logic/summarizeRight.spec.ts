import {expect} from 'chai'
import type {PolicyFile, RightDef} from '../../../../src/model/PolicyTypes.ts'
import {summarizeRight} from '../../../../src/ui/logic/summarizeRight.ts'

const policy: PolicyFile = {channels: ['A', 'B', 'C'], providers: [], rights: []}
const base: RightDef = {channels: [], description: '', name: 'R', roles: []}

describe('summarizeRight', () => {
  it('Erfolg: alle Channels und keine Bedingung', () => {
    const right = {...base, channels: ['A', 'B', 'C'], roles: ['SYSTEM']}
    expect(summarizeRight({policy, right})).to.equal('1 Rolle · alle Channels · immer')
  })

  it('Erfolg: zählt eindeutige Provider-Namen', () => {
    const right = {
      ...base,
      channels: ['A'],
      condition: {conditions: ['X', {conditions: ['Y', 'X'], operator: 'OR'}], operator: 'AND'},
      roles: ['SYSTEM', 'PRODUCT_USER'],
    }
    expect(summarizeRight({policy, right})).to.equal('2 Rollen · 1 Channel · 2 Bedingungen')
  })

  it('Erfolg: Singular bei einer Bedingung', () => {
    const right = {...base, channels: ['A', 'B'], condition: {conditions: ['X'], operator: 'AND'}, roles: ['S']}
    expect(summarizeRight({policy, right})).to.equal('1 Rolle · 2 Channels · 1 Bedingung')
  })

  it('Fehlschlag: leere Angaben werden benannt', () => {
    const right = {...base, condition: {conditions: [], operator: 'AND'}}
    expect(summarizeRight({policy, right})).to.equal('keine Rolle · kein Channel · leere Bedingung')
  })

  it('Fehlschlag: „alle Channels“ gilt nicht bei einer Policy ohne Channels', () => {
    const right = {...base, roles: ['S']}
    expect(summarizeRight({policy: {...policy, channels: []}, right})).to.equal('1 Rolle · kein Channel · immer')
  })
})
