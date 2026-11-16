import {expect} from 'chai'
import {flattenCondition, flattenPolicy} from '../../../src/model/flatten.ts'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'

describe('flattenCondition', () => {
  it('löst gleichartige Untergruppen auf', () => {
    const result = flattenCondition({
      node: {
        conditions: [
          {conditions: ['a'], operator: 'AND'},
          {conditions: ['b', 'c'], operator: 'AND'},
          {conditions: [{conditions: ['d'], operator: 'AND'}], operator: 'AND'},
        ],
        operator: 'AND',
      },
    })
    expect(result).to.deep.equal({conditions: ['a', 'b', 'c', 'd'], operator: 'AND'})
  })

  it('behält Untergruppen mit anderem Operator', () => {
    const node = {conditions: ['a', {conditions: ['b', 'c'], operator: 'OR'}], operator: 'AND'}
    expect(flattenCondition({node})).to.deep.equal(node)
  })

  it('löst OR in OR auf, aber nicht AND in OR', () => {
    const result = flattenCondition({
      node: {
        conditions: [
          {conditions: ['a', 'b'], operator: 'OR'},
          {conditions: ['c', 'd'], operator: 'AND'},
        ],
        operator: 'OR',
      },
    })
    expect(result).to.deep.equal({
      conditions: ['a', 'b', {conditions: ['c', 'd'], operator: 'AND'}],
      operator: 'OR',
    })
  })

  it('ersetzt einelementige Gruppen anderen Operators durch ihren Inhalt', () => {
    const result = flattenCondition({
      node: {conditions: ['a', {conditions: ['b'], operator: 'OR'}], operator: 'AND'},
    })
    expect(result).to.deep.equal({conditions: ['a', 'b'], operator: 'AND'})
  })

  it('übernimmt bei einziger Untergruppe deren Operator', () => {
    const result = flattenCondition({
      node: {conditions: [{conditions: ['a', 'b'], operator: 'OR'}], operator: 'AND'},
    })
    expect(result).to.deep.equal({conditions: ['a', 'b'], operator: 'OR'})
  })

  it('lässt leere Gruppen stehen', () => {
    const node = {conditions: ['a', {conditions: [], operator: 'AND'}], operator: 'AND'}
    expect(flattenCondition({node})).to.deep.equal(node)
  })
})

describe('flattenPolicy', () => {
  const policy: PolicyFile = {
    channels: ['A'],
    providers: [],
    rights: [
      {channels: ['A'], description: 'd', name: 'r1', roles: []},
      {
        channels: ['A'],
        condition: {
          conditions: [
            {conditions: ['a', 'b'], operator: 'AND'},
            {conditions: ['c'], operator: 'AND'},
          ],
          operator: 'AND',
        },
        description: 'd',
        name: 'r2',
        roles: [],
      },
    ],
  }

  it('glättet alle Rechte', () => {
    expect(flattenPolicy({policy}).rights[1]?.condition).to.deep.equal({conditions: ['a', 'b', 'c'], operator: 'AND'})
  })

  it('liefert dieselbe Referenz, wenn nichts zu glätten ist', () => {
    const flat = flattenPolicy({policy})
    expect(flattenPolicy({policy: flat})).to.equal(flat)
  })
})
