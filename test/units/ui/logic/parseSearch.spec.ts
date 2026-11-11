import {expect} from 'chai'
import {parseSearch} from '../../../../src/ui/logic/parseSearch.ts'

describe('parseSearch', () => {
  it('Erfolg: erkennt Schlüssel case-insensitiv und normalisiert die Rolle', () => {
    expect(parseSearch({text: 'rolle:system Channel:APP provider:Vertrag_aktiv sperr'})).to.deep.equal({
      channel: 'APP',
      provider: 'Vertrag_aktiv',
      query: 'sperr',
      role: 'SYSTEM',
    })
  })

  it('Erfolg: leerer Text ergibt einen leeren Filter', () => {
    expect(parseSearch({text: ''})).to.deep.equal({channel: null, provider: null, query: '', role: null})
  })

  it('Erfolg: Freitext wird mit einfachen Leerzeichen verbunden', () => {
    expect(parseSearch({text: '  a   rolle:x   b '}).query).to.equal('a b')
  })

  it('Fehlschlag: Schlüssel ohne Wert bleibt Freitext', () => {
    expect(parseSearch({text: 'rolle: x'})).to.deep.equal({
      channel: null,
      provider: null,
      query: 'rolle: x',
      role: null,
    })
  })
})
