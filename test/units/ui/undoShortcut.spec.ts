import {expect} from 'chai'
import {undoShortcut} from '../../../src/ui/undoShortcut.ts'

const BASE = {ctrlKey: false, key: 'z', metaKey: false, shiftKey: false, target: null}

describe('undoShortcut', () => {
  it('Erfolg: Strg+Z und ⌘+Z bedeuten Rückgängig', () => {
    expect(undoShortcut({event: {...BASE, ctrlKey: true}})).to.equal('undo')
    expect(undoShortcut({event: {...BASE, metaKey: true}})).to.equal('undo')
    expect(undoShortcut({event: {...BASE, key: 'Z', metaKey: true}})).to.equal('undo')
  })

  it('Erfolg: Umschalt+Z und Strg+Y bedeuten Wiederholen', () => {
    expect(undoShortcut({event: {...BASE, metaKey: true, shiftKey: true}})).to.equal('redo')
    expect(undoShortcut({event: {...BASE, ctrlKey: true, key: 'y'}})).to.equal('redo')
  })

  it('Erfolg: Checkboxen und Knöpfe lösen das Kürzel aus', () => {
    const target = {tagName: 'INPUT', type: 'checkbox'} as unknown as EventTarget
    expect(undoShortcut({event: {...BASE, ctrlKey: true, target}})).to.equal('undo')
  })

  it('Fehlschlag: in Textfeldern bleibt das native Rückgängig', () => {
    for (const target of [{tagName: 'INPUT', type: 'text'}, {tagName: 'INPUT'}, {tagName: 'TEXTAREA'}]) {
      expect(undoShortcut({event: {...BASE, ctrlKey: true, target: target as unknown as EventTarget}})).to.equal(null)
    }
  })

  it('Fehlschlag: ohne Modifikator oder mit anderer Taste nichts', () => {
    expect(undoShortcut({event: BASE})).to.equal(null)
    expect(undoShortcut({event: {...BASE, ctrlKey: true, key: 'a'}})).to.equal(null)
    expect(undoShortcut({event: {...BASE, key: 'y', metaKey: true}})).to.equal(null)
  })
})
