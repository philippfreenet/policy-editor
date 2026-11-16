import {expect} from 'chai'
import {buildDiffRows, countChangedLines, isUnchanged, toSplitRows} from '../../../src/ui/diffRows.ts'

const lines = (n: number): string => Array.from({length: n}, (_, i) => `z${i + 1}`).join('\n') + '\n'

describe('buildDiffRows', () => {
  it('Erfolg: identische Texte ergeben nur zusammengefasste Zeilen und gelten als unverändert', () => {
    const rows = buildDiffRows({context: 3, current: lines(10), original: lines(10)})
    expect(rows).to.deep.equal([{count: 10, kind: 'collapsed', newNo: null, oldNo: null, text: ''}])
    expect(isUnchanged({rows})).to.equal(true)
  })

  it('Erfolg: Änderung in der Mitte behält 3 Zeilen Kontext und fasst den Rest zusammen', () => {
    const original = lines(20)
    const current = original.replace('z10\n', 'neu\n')
    const rows = buildDiffRows({context: 3, current, original})
    expect(rows.map((r) => r.kind)).to.deep.equal([
      'collapsed',
      'context',
      'context',
      'context',
      'removed',
      'added',
      'context',
      'context',
      'context',
      'collapsed',
    ])
    expect(rows[0]?.count).to.equal(6)
    expect(rows[9]?.count).to.equal(7)
    expect(rows[4]?.text).to.equal('z10')
    expect(rows[5]?.text).to.equal('neu')
    expect(isUnchanged({rows})).to.equal(false)
  })

  it('Erfolg: Änderungen nahe beieinander werden nicht dazwischen zusammengefasst', () => {
    const original = lines(11)
    const current = original.replace('z3\n', 'a\n').replace('z8\n', 'b\n')
    const rows = buildDiffRows({context: 3, current, original})
    expect(rows.some((r) => r.kind === 'collapsed')).to.equal(false)
  })

  it('Fehlschlag: Vergleich gegen leeren Text markiert alles als hinzugefügt', () => {
    const rows = buildDiffRows({context: 3, current: 'a\nb\n', original: ''})
    expect(rows.map((r) => r.kind)).to.deep.equal(['added', 'added'])
    expect(isUnchanged({rows})).to.equal(false)
  })
})

describe('countChangedLines', () => {
  it('Erfolg: zählt hinzugefügte und entfernte Zeilen gegen das Original', () => {
    const original = lines(5)
    expect(countChangedLines({current: original.replace('z2\n', 'neu\n'), original})).to.equal(2)
    expect(countChangedLines({current: original, original})).to.equal(0)
  })

  it('Erfolg: ohne Original zählt jede Zeile als neu', () => {
    expect(countChangedLines({current: lines(4), original: null})).to.equal(4)
  })
})

describe('toSplitRows', () => {
  it('Erfolg: entfernte und hinzugefügte Zeilen stehen paarweise nebeneinander, Überhang bleibt leer', () => {
    const rows = toSplitRows({rows: buildDiffRows({context: 0, current: 'a\nx\ny\nc\n', original: 'a\nb\nc\n'})})
    expect(rows).to.deep.equal([
      {count: 1, kind: 'collapsed'},
      {kind: 'pair', left: {kind: 'removed', no: 2, text: 'b'}, right: {kind: 'added', no: 2, text: 'x'}},
      {kind: 'pair', left: null, right: {kind: 'added', no: 3, text: 'y'}},
      {count: 1, kind: 'collapsed'},
    ])
  })

  it('Erfolg: Kontextzeilen erscheinen auf beiden Seiten', () => {
    const rows = toSplitRows({rows: buildDiffRows({context: 1, current: 'a\nB\nc\n', original: 'a\nb\nc\n'})})
    expect(rows[0]).to.deep.equal({
      kind: 'pair',
      left: {kind: 'context', no: 1, text: 'a'},
      right: {kind: 'context', no: 1, text: 'a'},
    })
  })
})
