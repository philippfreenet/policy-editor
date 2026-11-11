import {expect} from 'chai'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {paramNameSuggestions} from '../../../src/ui/paramNameSuggestions.ts'

const policy: PolicyFile = {
  channels: ['C'],
  providers: [
    {
      className: 'X',
      name: 'a',
      params: [
        {name: 'Zeta', values: ['1']},
        {name: 'Alpha', values: ['1']},
      ],
    },
    {className: 'X', name: 'b', params: [{name: 'Alpha', values: ['2']}]},
    {className: 'Y', name: 'c', params: [{name: 'Fremd', values: ['1']}]},
    {className: 'X', name: 'd'},
  ],
  rights: [],
}

describe('paramNameSuggestions', () => {
  it('Erfolg: liefert sortierte, eindeutige Namen anderer Provider derselben Klasse', () => {
    expect(paramNameSuggestions({className: 'X', excludeProvider: 3, policy})).to.deep.equal(['Alpha', 'Zeta'])
  })

  it('Erfolg: schließt den eigenen Provider aus', () => {
    expect(paramNameSuggestions({className: 'X', excludeProvider: 0, policy})).to.deep.equal(['Alpha'])
  })

  it('Fehlschlag: unbekannte Klasse liefert nichts', () => {
    expect(paramNameSuggestions({className: 'Q', excludeProvider: null, policy})).to.deep.equal([])
  })
})
