import {expect} from 'chai'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {usageNames} from '../../../src/ui/usageNames.ts'

const policy: PolicyFile = {
  channels: [],
  providers: [],
  rights: [
    {channels: [], description: '', name: 'Erstes', roles: []},
    {channels: [], description: '', name: 'Zweites', roles: []},
  ],
}

describe('usageNames', () => {
  it('Erfolg: beschriftet mit öffentlicher ID (Index + 1) und Name', () => {
    expect(usageNames({indices: [0, 1], policy})).to.deep.equal(['#1 Erstes', '#2 Zweites'])
  })

  it('Fehlschlag: unbekannter Index ergibt nur die ID', () => {
    expect(usageNames({indices: [5], policy})).to.deep.equal(['#6 '])
  })
})
