import {expect} from 'chai'
import type {Finding} from '../../../../src/model/PolicyTypes.ts'
import {findingsAt} from '../../../../src/ui/logic/findingsAt.ts'

const f = (path: string): Finding => ({message: 'm', path, severity: 'error'})

describe('findingsAt', () => {
  it('Erfolg: trifft Pfad, Unterfelder und Unterindizes', () => {
    const findings = [f('rights[1]'), f('rights[1].name'), f('rights[1].condition[0]'), f('rights[2]')]
    expect(findingsAt({findings, prefix: 'rights[1]'})).to.deep.equal(findings.slice(0, 3))
  })

  it('Fehlschlag: rights[1] trifft nicht rights[12].name', () => {
    expect(findingsAt({findings: [f('rights[12].name')], prefix: 'rights[1]'})).to.deep.equal([])
  })
})
