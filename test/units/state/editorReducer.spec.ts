import {expect} from 'chai'
import {OperationError} from '../../../src/model/operations.ts'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {editorReducer, initialState} from '../../../src/state/editorReducer.ts'

const TEXT = JSON.stringify({channels: ['WEB'], providers: [], rights: []})

describe('editorReducer', () => {
  it('Erfolg: load setzt policy, original und findings', () => {
    const state = editorReducer(initialState, {text: TEXT, type: 'load'})
    expect(state.policy).to.deep.equal({channels: ['WEB'], providers: [], rights: []})
    expect(state.original).to.equal(TEXT)
    expect(state.error).to.equal(null)
    expect(state.parseFindings).to.deep.equal([])
    expect(state.findings).to.be.an('array')
  })

  it('Fehlschlag: load mit ungültigem JSON behält bisherigen Stand und setzt error', () => {
    const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})
    const state = editorReducer(loaded, {text: '{kaputt', type: 'load'})
    expect(state.policy).to.equal(loaded.policy)
    expect(state.original).to.equal(loaded.original)
    expect(state.findings).to.equal(loaded.findings)
    expect(state.error).to.be.a('string').and.not.equal('')
  })

  it('Erfolg: new setzt leere Policy ohne original', () => {
    const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})
    const state = editorReducer(loaded, {type: 'new'})
    expect(state.policy).to.deep.equal({channels: [], providers: [], rights: []})
    expect(state.original).to.equal(null)
    expect(state.parseFindings).to.deep.equal([])
  })

  it('Erfolg: edit ersetzt policy und berechnet findings neu', () => {
    const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})
    const state = editorReducer(loaded, {apply: (p: PolicyFile) => ({...p, channels: []}), type: 'edit'})
    expect(state.policy?.channels).to.deep.equal([])
    expect(state.error).to.equal(null)
  })

  it('Fehlschlag: edit mit OperationError setzt error, policy bleibt', () => {
    const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})
    const state = editorReducer(loaded, {
      apply: () => {
        throw new OperationError('Nicht erlaubt')
      },
      type: 'edit',
    })
    expect(state.policy).to.equal(loaded.policy)
    expect(state.error).to.equal('Nicht erlaubt')
  })

  it('Fehlschlag: edit mit anderem Fehler wird weitergeworfen', () => {
    const loaded = editorReducer(initialState, {text: TEXT, type: 'load'})
    expect(() =>
      editorReducer(loaded, {
        apply: () => {
          throw new TypeError('Programmierfehler')
        },
        type: 'edit',
      }),
    ).to.throw(TypeError)
  })

  it('Fehlschlag: edit ohne geladene Policy ist wirkungslos', () => {
    const state = editorReducer(initialState, {apply: (p) => p, type: 'edit'})
    expect(state).to.equal(initialState)
  })

  it('Erfolg: clearError setzt error zurück', () => {
    const failed = editorReducer(initialState, {text: '{kaputt', type: 'load'})
    expect(editorReducer(failed, {type: 'clearError'}).error).to.equal(null)
  })
})
