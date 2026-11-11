import {emptyPolicy, parsePolicy} from '../model/parse.ts'
import {OperationError} from '../model/operations.ts'
import type {Finding, PolicyFile} from '../model/PolicyTypes.ts'
import {validatePolicy} from '../model/validate.ts'

/** Gesamtzustand des Editors. */
export interface EditorState {
  /** Letzte Fehlermeldung für den Anwender, sonst null. */
  error: string | null
  /** Validierungsergebnis der aktuellen Policy. */
  findings: Finding[]
  /** Text der zuletzt geladenen Datei (Vergleichsbasis für den Diff), null bei neuer Policy. */
  original: string | null
  /** Befunde des letzten Ladens (z. B. unbekannte Felder). */
  parseFindings: Finding[]
  /** Aktuelle Policy, null solange nichts geladen ist. */
  policy: PolicyFile | null
}

export type EditorAction =
  | {apply: (p: PolicyFile) => PolicyFile; type: 'edit'}
  | {text: string; type: 'load'}
  | {type: 'clearError'}
  | {type: 'new'}

export const initialState: EditorState = {
  error: null,
  findings: [],
  original: null,
  parseFindings: [],
  policy: null,
}

/** Reducer des Editors: laden, neu anlegen, bearbeiten; die Validierung läuft nach jeder Änderung neu. */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'clearError':
      return {...state, error: null}
    case 'new': {
      const policy = emptyPolicy()
      return {
        error: null,
        findings: validatePolicy({policy}),
        original: null,
        parseFindings: [],
        policy,
      }
    }
    case 'load': {
      const result = parsePolicy({text: action.text})
      if (!result.ok) {
        return {...state, error: result.error}
      }
      return {
        error: null,
        findings: validatePolicy({policy: result.policy}),
        original: action.text,
        parseFindings: result.findings,
        policy: result.policy,
      }
    }
    case 'edit': {
      if (state.policy === null) {
        return state
      }
      try {
        const policy = action.apply(state.policy)
        return {...state, error: null, findings: validatePolicy({policy}), policy}
      } catch (error) {
        if (error instanceof OperationError) {
          return {...state, error: error.message}
        }
        throw error
      }
    }
  }
}
