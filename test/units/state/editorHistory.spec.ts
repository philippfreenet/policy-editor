import {expect} from 'chai'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {editorReducer, HISTORY_LIMIT, initialState} from '../../../src/state/editorReducer.ts'
import type {EditorState} from '../../../src/state/editorReducer.ts'

const TEXT = JSON.stringify({channels: ['WEB'], providers: [], rights: []})

/** Hängt einen Channel an. */
function addChannel(state: EditorState, channel: string, coalesce?: string): EditorState {
  return editorReducer(state, {
    apply: (p: PolicyFile) => ({...p, channels: [...p.channels, channel]}),
    coalesce,
    type: 'edit',
  })
}

describe('editorReducer – Rückgängig/Wiederholen', () => {
  const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})

  it('Erfolg: undo stellt den vorigen Stand her, redo den späteren', () => {
    const edited = addChannel(loaded, 'APP')
    const undone = editorReducer(edited, {type: 'undo'})
    expect(undone.policy?.channels).to.deep.equal(['WEB'])
    expect(undone.future).to.have.length(1)
    const redone = editorReducer(undone, {type: 'redo'})
    expect(redone.policy?.channels).to.deep.equal(['WEB', 'APP'])
    expect(redone.past).to.have.length(1)
    expect(redone.future).to.deep.equal([])
  })

  it('Erfolg: undo berechnet die Befunde neu', () => {
    const edited = editorReducer(loaded, {apply: (p: PolicyFile) => ({...p, channels: ['WEB', 'WEB']}), type: 'edit'})
    const undone = editorReducer(edited, {type: 'undo'})
    expect(undone.findings).to.deep.equal(loaded.findings)
  })

  it('Erfolg: eine neue Änderung verwirft die Wiederholen-Liste', () => {
    const undone = editorReducer(addChannel(loaded, 'APP'), {type: 'undo'})
    const edited = addChannel(undone, 'SHOP')
    expect(edited.future).to.deep.equal([])
  })

  it('Erfolg: Änderungen mit gleichem coalesce-Schlüssel bilden einen Schritt', () => {
    const typed = addChannel(addChannel(addChannel(loaded, 'A', 'feld'), 'B', 'feld'), 'C', 'feld')
    expect(typed.past).to.have.length(1)
    expect(editorReducer(typed, {type: 'undo'}).policy?.channels).to.deep.equal(['WEB'])
  })

  it('Erfolg: nach undo beginnt gleicher Schlüssel einen neuen Schritt', () => {
    const typed = addChannel(addChannel(loaded, 'A', 'feld'), 'B', 'feld')
    const again = addChannel(editorReducer(typed, {type: 'undo'}), 'C', 'feld')
    expect(again.past).to.have.length(1)
  })

  it('Erfolg: die Historie ist auf HISTORY_LIMIT begrenzt', () => {
    let state = loaded
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      state = addChannel(state, `C${i}`)
    }
    expect(state.past).to.have.length(HISTORY_LIMIT)
  })

  it('Erfolg: load und new leeren die Historie', () => {
    const edited = addChannel(loaded, 'APP')
    expect(editorReducer(edited, {text: TEXT, type: 'load'}).past).to.deep.equal([])
    expect(editorReducer(edited, {type: 'new'}).past).to.deep.equal([])
  })

  it('Fehlschlag: undo ohne Historie und redo ohne Zukunft ändern nichts', () => {
    expect(editorReducer(loaded, {type: 'undo'})).to.equal(loaded)
    expect(editorReducer(loaded, {type: 'redo'})).to.equal(loaded)
    expect(editorReducer(initialState, {type: 'undo'})).to.equal(initialState)
  })

  it('Fehlschlag: eine abgelehnte Änderung landet nicht in der Historie', () => {
    const state = editorReducer(loaded, {apply: (p: PolicyFile) => p, type: 'edit'})
    expect(state.past).to.deep.equal([])
  })
})
