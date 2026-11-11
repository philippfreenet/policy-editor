import {parsePolicy} from '../model/parse.ts'
import {validatePolicy} from '../model/validate.ts'
import type {EditorState} from './editorReducer.ts'

const AUTOSAVE_KEY = 'policy-editor/v1'

type AutosaveStorage = Pick<Storage, 'getItem' | 'setItem'> | undefined

/** Stellt den Zustand aus dem Autosave wieder her; fehlt der Eintrag oder ist er beschädigt, kommt null zurück. */
export function loadAutosave(args: {storage: AutosaveStorage}): EditorState | null {
  try {
    const raw = args.storage?.getItem(AUTOSAVE_KEY)
    if (raw === null || raw === undefined) {
      return null
    }
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) {
      return null
    }
    const {original, policy: stored} = data as {original?: unknown; policy?: unknown}
    if (original !== null && typeof original !== 'string') {
      return null
    }
    if (typeof stored !== 'object' || stored === null) {
      return null
    }
    const shape = stored as {channels?: unknown; providers?: unknown; rights?: unknown}
    if (!Array.isArray(shape.channels) || !Array.isArray(shape.providers) || !Array.isArray(shape.rights)) {
      return null
    }
    const result = parsePolicy({text: JSON.stringify(stored)})
    if (!result.ok) {
      return null
    }
    return {
      error: null,
      findings: validatePolicy({policy: result.policy}),
      future: [],
      lastCoalesce: null,
      original,
      parseFindings: [],
      past: [],
      policy: result.policy,
    }
  } catch {
    return null
  }
}

/** Schreibt den Zustand in den Autosave; ohne Policy oder bei Speicherfehlern geschieht nichts. */
export function saveAutosave(args: {state: EditorState; storage: AutosaveStorage}): void {
  if (args.state.policy === null || args.storage === undefined) {
    return
  }
  try {
    args.storage.setItem(AUTOSAVE_KEY, JSON.stringify({original: args.state.original, policy: args.state.policy}))
  } catch {
    /* Speicher voll oder gesperrt: Autosave ist nur eine Komfortfunktion */
  }
}
