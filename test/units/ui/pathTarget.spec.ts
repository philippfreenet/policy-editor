import {expect} from 'chai'
import {parseFindingPath} from '../../../src/ui/pathTarget.ts'

describe('parseFindingPath', () => {
  it('Erfolg: liest Tab und Index aus providers[3].name', () => {
    expect(parseFindingPath({path: 'providers[3].name'})).to.deep.equal({index: 3, tab: 'providers'})
  })

  it('Erfolg: rights[12].condition.conditions[0] liefert den Index des Rechts', () => {
    expect(parseFindingPath({path: 'rights[12].condition.conditions[0]'})).to.deep.equal({index: 12, tab: 'rights'})
  })

  it('Erfolg: channels ohne Index liefert index null', () => {
    expect(parseFindingPath({path: 'channels'})).to.deep.equal({index: null, tab: 'channels'})
  })

  it('Erfolg: channels[1] liefert Index 1', () => {
    expect(parseFindingPath({path: 'channels[1]'})).to.deep.equal({index: 1, tab: 'channels'})
  })

  it('Fehlschlag: unbekanntes erstes Segment liefert null', () => {
    expect(parseFindingPath({path: 'foo[1]'})).to.equal(null)
    expect(parseFindingPath({path: ''})).to.equal(null)
    expect(parseFindingPath({path: 'rightsX[1]'})).to.equal(null)
  })
})
