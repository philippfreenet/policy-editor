import {expect} from 'chai'
import {uniqueName} from '../../../src/ui/uniqueName.ts'

describe('uniqueName', () => {
  it('Erfolg: liefert die Basis, wenn sie frei ist', () => {
    expect(uniqueName({base: 'Neu', taken: ['A']})).to.equal('Neu')
  })

  it('Erfolg: hängt _2, _3 an, bis der Name frei ist', () => {
    expect(uniqueName({base: 'Neu', taken: ['Neu']})).to.equal('Neu_2')
    expect(uniqueName({base: 'Neu', taken: ['Neu', 'Neu_2']})).to.equal('Neu_3')
  })

  it('Fehlschlag: ein belegtes Suffix wird übersprungen, nicht wiederverwendet', () => {
    expect(uniqueName({base: 'Neu', taken: ['Neu', 'Neu_3']})).to.equal('Neu_2')
    expect(uniqueName({base: 'Neu', taken: ['Neu', 'Neu_2', 'Neu_3']})).to.equal('Neu_4')
  })
})
