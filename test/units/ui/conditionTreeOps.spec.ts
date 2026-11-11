import {expect} from 'chai'
import type {CompositeNode} from '../../../src/model/PolicyTypes.ts'
import {
  insertChildAt,
  moveChildWithin,
  removeNodeAt,
  setOperatorAt,
  updateNodeAt,
} from '../../../src/ui/conditionTreeOps.ts'

const deep: CompositeNode = {
  conditions: ['A', {conditions: ['B', {conditions: ['C', 'D'], operator: 'OR'}], operator: 'AND'}],
  operator: 'AND',
}

describe('conditionTreeOps', () => {
  describe('updateNodeAt', () => {
    it('Erfolg: ersetzt ein Blatt in Tiefe 3 und lässt das Original unverändert', () => {
      const next = updateNodeAt({node: 'X', path: [1, 1, 0], root: deep})
      expect(next).to.deep.equal({
        conditions: ['A', {conditions: ['B', {conditions: ['X', 'D'], operator: 'OR'}], operator: 'AND'}],
        operator: 'AND',
      })
      expect(deep.conditions[1]).to.not.equal(next.conditions[1])
      expect(JSON.stringify(deep)).to.contain('"C"')
    })

    it('Erfolg: leerer Pfad ersetzt die Wurzel durch eine Gruppe', () => {
      const group: CompositeNode = {conditions: [], operator: 'OR'}
      expect(updateNodeAt({node: group, path: [], root: deep})).to.deep.equal(group)
    })

    it('Fehlschlag: leerer Pfad mit Blatt wirft', () => {
      expect(() => updateNodeAt({node: 'X', path: [], root: deep})).to.throw()
    })

    it('Fehlschlag: Pfad außerhalb des Baums wirft', () => {
      expect(() => updateNodeAt({node: 'X', path: [5], root: deep})).to.throw()
      expect(() => updateNodeAt({node: 'X', path: [0, 0], root: deep})).to.throw()
    })
  })

  describe('removeNodeAt', () => {
    it('Erfolg: entfernt einen Knoten in Tiefe 3', () => {
      const next = removeNodeAt({path: [1, 1, 1], root: deep})
      expect((next.conditions[1] as CompositeNode).conditions[1]).to.deep.equal({conditions: ['C'], operator: 'OR'})
    })

    it('Erfolg: entfernt eine ganze Gruppe', () => {
      expect(removeNodeAt({path: [1], root: deep}).conditions).to.deep.equal(['A'])
    })

    it('Fehlschlag: Wurzel und ungültige Pfade werfen', () => {
      expect(() => removeNodeAt({path: [], root: deep})).to.throw()
      expect(() => removeNodeAt({path: [9], root: deep})).to.throw()
      expect(() => removeNodeAt({path: [0, 0], root: deep})).to.throw()
    })
  })

  describe('insertChildAt', () => {
    it('Erfolg: hängt an die Wurzel an', () => {
      expect(insertChildAt({child: 'Z', path: [], root: deep}).conditions).to.have.length(3)
    })

    it('Erfolg: hängt eine Gruppe in Tiefe 3 an', () => {
      const group: CompositeNode = {conditions: [], operator: 'AND'}
      const next = insertChildAt({child: group, path: [1, 1], root: deep})
      const inner = (next.conditions[1] as CompositeNode).conditions[1] as CompositeNode
      expect(inner.conditions).to.deep.equal(['C', 'D', group])
    })

    it('Fehlschlag: Ziel ist ein Blatt oder außerhalb', () => {
      expect(() => insertChildAt({child: 'Z', path: [0], root: deep})).to.throw()
      expect(() => insertChildAt({child: 'Z', path: [7], root: deep})).to.throw()
    })
  })

  describe('moveChildWithin', () => {
    it('Erfolg: verschiebt nach unten und oben innerhalb der Gruppe', () => {
      const down = moveChildWithin({direction: 1, path: [1, 1, 0], root: deep})
      expect(((down.conditions[1] as CompositeNode).conditions[1] as CompositeNode).conditions).to.deep.equal([
        'D',
        'C',
      ])
      const up = moveChildWithin({direction: -1, path: [1], root: deep})
      expect(up.conditions[0]).to.deep.equal(deep.conditions[1])
      expect(up.conditions[1]).to.equal('A')
    })

    it('Erfolg: am Rand bleibt der Baum unverändert', () => {
      expect(moveChildWithin({direction: -1, path: [0], root: deep})).to.deep.equal(deep)
      expect(moveChildWithin({direction: 1, path: [1], root: deep})).to.deep.equal(deep)
    })

    it('Fehlschlag: Wurzel und ungültige Pfade werfen', () => {
      expect(() => moveChildWithin({direction: 1, path: [], root: deep})).to.throw()
      expect(() => moveChildWithin({direction: 1, path: [4], root: deep})).to.throw()
    })
  })

  describe('setOperatorAt', () => {
    it('Erfolg: setzt den Operator einer tiefen Gruppe', () => {
      const next = setOperatorAt({operator: 'AND', path: [1, 1], root: deep})
      expect(((next.conditions[1] as CompositeNode).conditions[1] as CompositeNode).operator).to.equal('AND')
      expect(next.operator).to.equal('AND')
    })

    it('Fehlschlag: Ziel ist ein Blatt oder außerhalb', () => {
      expect(() => setOperatorAt({operator: 'OR', path: [0], root: deep})).to.throw()
      expect(() => setOperatorAt({operator: 'OR', path: [3], root: deep})).to.throw()
    })
  })
})
