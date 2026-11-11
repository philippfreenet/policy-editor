import {expect} from 'chai'
import {formatCondition} from '../../../src/model/formatCondition.ts'

describe('formatCondition', () => {
  it('Erfolg: Wurzel ohne Klammern, verschachtelte Gruppen mit Klammern', () => {
    const node = {conditions: ['A', {conditions: ['B', 'C'], operator: 'OR'}], operator: 'AND'}
    expect(formatCondition({node})).to.equal('A AND (B OR C)')
  })

  it('Erfolg: tiefe Verschachtelung', () => {
    const node = {
      conditions: [{conditions: ['A', {conditions: ['B', 'C'], operator: 'AND'}], operator: 'OR'}, 'D'],
      operator: 'AND',
    }
    expect(formatCondition({node})).to.equal('(A OR (B AND C)) AND D')
  })

  it('Erfolg: ein einzelner Provider-Name', () => {
    expect(formatCondition({node: 'A'})).to.equal('A')
  })

  it('Fehlschlag: leere Gruppen werden als () sichtbar', () => {
    expect(formatCondition({node: {conditions: [], operator: 'AND'}})).to.equal('()')
    expect(formatCondition({node: {conditions: ['A', {conditions: [], operator: 'OR'}], operator: 'AND'}})).to.equal(
      'A AND ()',
    )
  })
})
