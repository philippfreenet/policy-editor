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
  /** Spätere Stände für Wiederholen (jüngster zuerst). */
  future: PolicyFile[]
  /** Schlüssel der letzten zusammengefassten Änderung, sonst null. */
  lastCoalesce: string | null
  /** Text der zuletzt geladenen Datei (Vergleichsbasis für den Diff), null bei neuer Policy. */
  original: string | null
  /** Befunde des letzten Ladens (z. B. unbekannte Felder). */
  parseFindings: Finding[]
  /** Frühere Stände für Rückgängig (ältester zuerst). */
  past: PolicyFile[]
  /** Aktuelle Policy, null solange nichts geladen ist. */
  policy: PolicyFile | null
}

export type EditorAction =
  | {
      apply: (p: PolicyFile) => PolicyFile
      /** Aufeinanderfolgende Änderungen mit gleichem Schlüssel (z. B. Tippen in einem Feld) bilden einen Undo-Schritt. */
      coalesce?: string
      type: 'edit'
    }
  | {text: string; type: 'load'}
  | {type: 'clearError'}
  | {type: 'new'}
  | {type: 'redo'}
  | {type: 'undo'}

/** Höchstzahl der gemerkten Stände für Rückgängig. */
export const HISTORY_LIMIT = 100

const EMPTY_HISTORY = {future: [], lastCoalesce: null, past: []}

export const initialState: EditorState = {
  ...EMPTY_HISTORY,
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
        ...EMPTY_HISTORY,
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
        ...EMPTY_HISTORY,
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
        if (policy === state.policy) {
          return {...state, error: null}
        }
        const coalesce = action.coalesce ?? null
        const merge = coalesce !== null && coalesce === state.lastCoalesce
        return {
          ...state,
          error: null,
          findings: validatePolicy({policy}),
          future: [],
          lastCoalesce: coalesce,
          past: merge ? state.past : [...state.past, state.policy].slice(-HISTORY_LIMIT),
          policy,
        }
      } catch (error) {
        if (error instanceof OperationError) {
          return {...state, error: error.message}
        }
        throw error
      }
    }
    case 'undo': {
      const previous = state.past.at(-1)
      if (previous === undefined || state.policy === null) {
        return state
      }
      return {
        ...state,
        error: null,
        findings: validatePolicy({policy: previous}),
        future: [state.policy, ...state.future],
        lastCoalesce: null,
        past: state.past.slice(0, -1),
        policy: previous,
      }
    }
    case 'redo': {
      const next = state.future[0]
      if (next === undefined || state.policy === null) {
        return state
      }
      return {
        ...state,
        error: null,
        findings: validatePolicy({policy: next}),
        future: state.future.slice(1),
        lastCoalesce: null,
        past: [...state.past, state.policy],
        policy: next,
      }
    }
  }
}
