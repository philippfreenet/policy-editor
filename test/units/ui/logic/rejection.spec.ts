import {expect} from 'chai'
import {OperationError} from '../../../../src/model/operations.ts'
import {rejection} from '../../../../src/ui/logic/rejection.ts'

describe('rejection', () => {
  it('Erfolg: liefert null, wenn die Operation gelingt', () => {
    expect(rejection({run: () => 1})).to.equal(null)
  })

  it('Fehlschlag: liefert die Meldung einer abgelehnten Operation', () => {
    expect(
      rejection({
        run: () => {
          throw new OperationError('Channel A existiert bereits')
        },
      }),
    ).to.equal('Channel A existiert bereits')
  })

  it('Fehlschlag: reicht andere Fehler weiter', () => {
    expect(() =>
      rejection({
        run: () => {
          throw new TypeError('kaputt')
        },
      }),
    ).to.throw(TypeError, 'kaputt')
  })
})
