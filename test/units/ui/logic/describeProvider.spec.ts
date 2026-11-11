import {expect} from 'chai'
import type {ProviderDef} from '../../../../src/model/PolicyTypes.ts'
import {describeProvider} from '../../../../src/ui/logic/describeProvider.ts'

const p: ProviderDef = {
  className: 'ContractStateProvider',
  name: 'Vertrag_aktiv',
  negation: false,
  params: [{name: 'ContractStates', values: ['ACTIVE', 'ACTIVE_PLANNED', 'DEACTIVE_PLANNED']}],
}

describe('describeProvider', () => {
  it('Erfolg: beschreibt einen Provider mit Parameter', () => {
    expect(describeProvider({provider: p})).to.deep.equal({
      sentence: 'Trifft zu, wenn ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED',
      short: 'ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED',
    })
  })

  it('Erfolg: Negation', () => {
    expect(describeProvider({provider: {...p, negation: true}}).sentence).to.equal(
      'Trifft nicht zu, wenn ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED',
    )
  })

  it('Erfolg: mehrere Parameter, Kurzform kürzt nach 3 Werten', () => {
    const provider: ProviderDef = {
      ...p,
      params: [
        {name: 'A', values: ['1', '2', '3', '4']},
        {name: 'B', values: [true]},
      ],
    }
    const result = describeProvider({provider})
    expect(result.sentence).to.equal('Trifft zu, wenn A ∈ 1, 2, 3, 4 und B ∈ true')
    expect(result.short).to.equal('A ∈ 1, 2, 3, … und B ∈ true')
  })

  it('Fehlschlag: ohne Parameter bleibt nur die Klasse', () => {
    expect(describeProvider({provider: {className: 'MNPProvider', name: 'X', negation: false}})).to.deep.equal({
      sentence: 'Trifft zu laut MNPProvider',
      short: 'MNPProvider',
    })
  })
})
