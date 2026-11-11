import {expect} from 'chai'
import {viewTarget} from '../../../../src/ui/logic/viewTarget.ts'

describe('viewTarget', () => {
  it('Erfolg: Recht mit Bedingung', () => {
    expect(viewTarget({path: 'rights[12].condition.conditions[1]'})).to.deep.equal({
      field: 'condition',
      index: 12,
      view: 'rights',
    })
  })

  it('Erfolg: Provider-Parameter', () => {
    expect(viewTarget({path: 'providers[3].params[0].values'})).to.deep.equal({
      field: 'params',
      index: 3,
      view: 'providers',
    })
  })

  it('Erfolg: Channel ohne Feld', () => {
    expect(viewTarget({path: 'channels[2]'})).to.deep.equal({field: null, index: 2, view: 'channels'})
  })

  it('Erfolg: nur der Bereich', () => {
    expect(viewTarget({path: 'rights'})).to.deep.equal({field: null, index: null, view: 'rights'})
  })

  it('Fehlschlag: unbekannter Bereich', () => {
    expect(viewTarget({path: 'foo[1]'})).to.equal(null)
  })
})
