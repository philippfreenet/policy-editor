import {expect} from 'chai'
import type {PolicyFile, RightDef} from '../../../src/model/PolicyTypes.ts'
import {conditionProviders, matchesFilter, rightsFor} from '../../../src/model/rightQueries.ts'
import type {RightFilter} from '../../../src/model/rightQueries.ts'

const NONE: RightFilter = {channel: null, provider: null, query: '', role: null}
const RIGHT: RightDef = {
  channels: ['WEB'],
  condition: {conditions: ['A', {conditions: ['B'], operator: 'OR'}], operator: 'AND'},
  description: 'Tarifdetails anzeigen',
  name: 'Tarif',
  roles: ['PRODUCT_OWNER'],
}

describe('rightQueries', () => {
  it('Erfolg: conditionProviders findet Namen in jeder Tiefe', () => {
    expect([...conditionProviders({node: RIGHT.condition!})]).to.deep.equal(['A', 'B'])
  })

  it('Erfolg: ohne Filter passt jedes Recht', () => {
    expect(matchesFilter({filter: NONE, right: RIGHT})).to.equal(true)
  })

  it('Erfolg: Text, Rolle, Channel und Provider passen', () => {
    const filter = {channel: 'WEB', provider: 'B', query: 'tarifdet', role: 'PRODUCT_OWNER'}
    expect(matchesFilter({filter, right: RIGHT})).to.equal(true)
  })

  it('Fehlschlag: jedes einzelne Kriterium kann ausschließen', () => {
    expect(matchesFilter({filter: {...NONE, query: 'xyz'}, right: RIGHT})).to.equal(false)
    expect(matchesFilter({filter: {...NONE, role: 'SYSTEM'}, right: RIGHT})).to.equal(false)
    expect(matchesFilter({filter: {...NONE, channel: 'APP'}, right: RIGHT})).to.equal(false)
    expect(matchesFilter({filter: {...NONE, provider: 'C'}, right: RIGHT})).to.equal(false)
  })

  it('Fehlschlag: Provider-Filter schließt statische Rechte aus', () => {
    const {condition: _c, ...staticRight} = RIGHT
    expect(matchesFilter({filter: {...NONE, provider: 'A'}, right: staticRight})).to.equal(false)
  })

  it('Erfolg: rightsFor liefert nur Rechte mit Rolle UND Channel', () => {
    const policy: PolicyFile = {
      channels: ['WEB', 'APP'],
      providers: [],
      rights: [RIGHT, {...RIGHT, channels: ['APP']}, {...RIGHT, roles: ['SYSTEM']}, RIGHT],
    }
    expect(rightsFor({channel: 'WEB', policy, role: 'PRODUCT_OWNER'})).to.deep.equal([0, 3])
    expect(rightsFor({channel: 'APP', policy, role: 'SYSTEM'})).to.deep.equal([])
  })
})
