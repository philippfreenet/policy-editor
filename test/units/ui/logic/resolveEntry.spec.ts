import {expect} from 'chai'
import {resolveEntry} from '../../../../src/ui/logic/resolveEntry.ts'

const items = (...names: string[]): {name: string}[] => names.map((name) => ({name}))

describe('resolveEntry', () => {
  it('Erfolg: unveränderte Liste behält Position und Name', () => {
    expect(resolveEntry({entry: {index: 1, name: 'b'}, items: items('a', 'b', 'c')})).to.deep.equal({
      index: 1,
      name: 'b',
    })
  })

  it('Erfolg: verschobener Eintrag wird über den Namen wiedergefunden', () => {
    expect(resolveEntry({entry: {index: 2, name: 'b'}, items: items('a', 'b', 'c')})).to.deep.equal({
      index: 1,
      name: 'b',
    })
  })

  it('Erfolg: umbenannter Eintrag bleibt an seiner Position und übernimmt den neuen Namen', () => {
    expect(resolveEntry({entry: {index: 1, name: 'alt'}, items: items('a', 'neu')})).to.deep.equal({
      index: 1,
      name: 'neu',
    })
  })

  it('Erfolg: unbekannter Name wird an der Position ergänzt', () => {
    expect(resolveEntry({entry: {index: 0, name: null}, items: items('a')})).to.deep.equal({index: 0, name: 'a'})
  })

  it('Erfolg: bei doppelten Namen bleibt die passende Position gewählt', () => {
    expect(resolveEntry({entry: {index: 2, name: 'x'}, items: items('x', 'y', 'x')})).to.deep.equal({
      index: 2,
      name: 'x',
    })
  })

  it('Fehlschlag: verschwundener Eintrag außerhalb der Liste hebt die Auswahl auf', () => {
    expect(resolveEntry({entry: {index: 3, name: 'weg'}, items: items('a')})).to.deep.equal({index: null, name: null})
  })

  it('Fehlschlag: ohne Auswahl bleibt nichts gewählt', () => {
    expect(resolveEntry({entry: {index: null, name: 'a'}, items: items('a')})).to.deep.equal({index: null, name: null})
  })
})
