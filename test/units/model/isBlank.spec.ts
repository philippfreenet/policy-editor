import {expect} from 'chai'
import {isBlank} from '../../../src/model/isBlank.ts'

describe('isBlank', () => {
  it('Erfolg: leerer Text ist leer', () => {
    expect(isBlank({value: ''})).to.equal(true)
  })

  it('Erfolg: Steuerzeichen U+001F gilt als Leerraum', () => {
    expect(isBlank({value: '\u001F'})).to.equal(true)
  })

  it('Erfolg: gewöhnliches Leerzeichen U+0020 und Tabulator gelten als Leerraum', () => {
    expect(isBlank({value: '\u0020\t\n'})).to.equal(true)
  })

  it('Erfolg: Zeilentrenner U+2028 und ideographisches Leerzeichen gelten als Leerraum', () => {
    expect(isBlank({value: '\u2028\u3000'})).to.equal(true)
  })

  it('Fehlschlag: geschütztes Leerzeichen U+00A0 ist kein Leerraum', () => {
    expect(isBlank({value: '\u00A0'})).to.equal(false)
  })

  it('Fehlschlag: U+2007 und U+202F sind kein Leerraum', () => {
    expect(isBlank({value: '\u2007'})).to.equal(false)
    expect(isBlank({value: '\u202F'})).to.equal(false)
  })

  it('Fehlschlag: Text mit Buchstaben ist nicht leer', () => {
    expect(isBlank({value: 'a'})).to.equal(false)
    expect(isBlank({value: ' a '})).to.equal(false)
  })
})
