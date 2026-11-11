import {expect} from 'chai'
import {convertValues, droppedValues, valueType} from '../../../src/ui/convertValues.ts'

describe('convertValues', () => {
  it('Erfolg: Text -> Zahl behält nur ganze Zahlen', () => {
    expect(convertValues({target: 'number', values: ['1', 'x', '2.5', '-7', 3]})).to.deep.equal([1, -7, 3])
  })

  it('Erfolg: Text -> Ja/Nein behält true/false in beliebiger Schreibweise', () => {
    expect(convertValues({target: 'boolean', values: ['TRUE', 'false', 'ja', true]})).to.deep.equal([true, false, true])
  })

  it('Erfolg: nach Text wird jeder Wert zu String', () => {
    expect(convertValues({target: 'string', values: [1, true, 'a']})).to.deep.equal(['1', 'true', 'a'])
  })

  it('Fehlschlag: nicht umwandelbare Werte entfallen, Zahl -> Ja/Nein leert die Liste', () => {
    expect(convertValues({target: 'boolean', values: [1, 2]})).to.deep.equal([])
    expect(convertValues({target: 'number', values: ['abc']})).to.deep.equal([])
  })
})

describe('valueType', () => {
  it('Erfolg: leitet den Typ vom ersten Wert ab, leer ist Text', () => {
    expect(valueType({values: [1]})).to.equal('number')
    expect(valueType({values: [false]})).to.equal('boolean')
    expect(valueType({values: ['a']})).to.equal('string')
  })

  it('Fehlschlag: leere Liste ergibt Text', () => {
    expect(valueType({values: []})).to.equal('string')
  })

  it('Erfolg: droppedValues nennt die beim Wechsel zu Zahl verlorenen Werte', () => {
    expect(droppedValues({target: 'number', values: ['ACTIVE', '7', 'ACTIVE_PLANNED']})).to.deep.equal([
      'ACTIVE',
      'ACTIVE_PLANNED',
    ])
  })

  it('Erfolg: droppedValues ist beim Wechsel zu Text leer', () => {
    expect(droppedValues({target: 'string', values: [1, true]})).to.deep.equal([])
  })

  it('Fehlschlag: droppedValues ist leer, wenn alles umwandelbar ist', () => {
    expect(droppedValues({target: 'boolean', values: ['true', 'FALSE', false]})).to.deep.equal([])
    expect(droppedValues({target: 'boolean', values: [1]})).to.deep.equal(['1'])
  })
})
