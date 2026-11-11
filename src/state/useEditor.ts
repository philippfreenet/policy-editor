import {useEffect, useReducer} from 'react'
import {loadAutosave, saveAutosave} from './autosave.ts'
import {editorReducer, initialState} from './editorReducer.ts'
import type {EditorAction, EditorState} from './editorReducer.ts'

/** Liefert localStorage oder undefined, falls der Zugriff selbst fehlschlägt (z. B. gesperrter Speicher). */
function getStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/** React-Hook: Editor-Zustand mit Wiederherstellung und automatischem Speichern in localStorage. */
export function useEditor(): {dispatch: (a: EditorAction) => void; state: EditorState} {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    () => loadAutosave({storage: getStorage()}) ?? initialState,
  )
  useEffect(() => {
    saveAutosave({state, storage: getStorage()})
  }, [state])
  return {dispatch, state}
}
