import {expect} from 'chai'
import sinon from 'sinon'
import {loadAutosave, saveAutosave} from '../../../src/state/autosave.ts'
import {editorReducer, initialState} from '../../../src/state/editorReducer.ts'

/** Einfacher In-Memory-Speicher als Ersatz für localStorage. */
function fakeStorage(args: {initial?: string}): {getItem: sinon.SinonStub; setItem: sinon.SinonStub} {
  return {
    getItem: sinon.stub().returns(args.initial ?? null),
    setItem: sinon.stub(),
  }
}

const TEXT = JSON.stringify({channels: ['WEB'], providers: [], rights: []})

describe('autosave', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('Erfolg: Autosave speichert und lädt', () => {
    const state = editorReducer(initialState, {text: TEXT, type: 'load'})
    const writer = fakeStorage({})
    saveAutosave({state, storage: writer})
    expect(writer.setItem.calledOnce).to.equal(true)
    expect(writer.setItem.firstCall.args[0]).to.equal('policy-editor/v1')

    const reader = fakeStorage({initial: writer.setItem.firstCall.args[1] as string})
    const restored = loadAutosave({storage: reader})
    expect(restored?.policy).to.deep.equal(state.policy)
    expect(restored?.original).to.equal(TEXT)
    expect(restored?.error).to.equal(null)
    expect(restored?.parseFindings).to.deep.equal([])
    expect(restored?.findings).to.be.an('array')
  })

  it('Erfolg: kein Eintrag ergibt null', () => {
    expect(loadAutosave({storage: fakeStorage({})})).to.equal(null)
  })

  it('Fehlschlag: beschädigter Autosave-Eintrag wird ignoriert', () => {
    for (const value of [
      '{kaputt',
      '{"policy":5}',
      '{"policy":{"channels":[],"providers":[]},"original":null}',
      'null',
    ]) {
      expect(loadAutosave({storage: fakeStorage({initial: value})}), value).to.equal(null)
    }
  })

  it('Fehlschlag: ohne Storage kein Absturz', () => {
    expect(loadAutosave({storage: undefined})).to.equal(null)
    saveAutosave({state: initialState, storage: undefined})
  })

  it('Fehlschlag: Storage wirft – kein Absturz', () => {
    const state = editorReducer(initialState, {text: TEXT, type: 'load'})
    const storage = fakeStorage({})
    storage.setItem.throws(new Error('voll'))
    storage.getItem.throws(new Error('gesperrt'))
    saveAutosave({state, storage})
    expect(loadAutosave({storage})).to.equal(null)
  })

  it('Erfolg: ohne Policy wird nichts geschrieben', () => {
    const storage = fakeStorage({})
    saveAutosave({state: initialState, storage})
    expect(storage.setItem.called).to.equal(false)
  })
})
