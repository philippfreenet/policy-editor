import {useEffect} from 'react'
import type {EditorAction} from '../state/editorReducer.ts'
import {isTextField, undoShortcut} from './undoShortcut.ts'

/** Selektor der Listen, in denen ↑/↓ die Auswahl verschiebt. */
const LIST_SELECTOR = '#rights-list, #providers-list'

/** Prüft, ob das Ziel innerhalb einer der verschiebbaren Listen liegt. */
function insideList(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(LIST_SELECTOR) !== null
}

interface UseShortcutsArgs {
  dispatch: (action: EditorAction) => void
  /** Schaltet alle Kürzel ab (Startbildschirm, offener Dialog der Anwendung). */
  enabled: boolean
  /** Fokussiert die Suche der aktuellen Ansicht. */
  onFocusSearch: () => void
  /** Verschiebt die Auswahl um einen Eintrag der sichtbaren Liste, in der der Fokus liegt. */
  onMoveSelection: (delta: -1 | 1) => void
}

/**
 * Registriert die globalen Tastenkürzel an einem einzigen keydown-Listener: Rückgängig/Wiederholen, `/` für die
 * Suche und ↑/↓ in den Listen. Der Hook meldet nur die Absicht; die Ansichten behalten ihren Auswahlzustand.
 * Kein Kürzel greift in Textfeldern oder solange ein Dialog (`role="dialog"`, auch innerhalb der Ansichten) offen ist.
 */
export function useShortcuts({dispatch, enabled, onFocusSearch, onMoveSelection}: UseShortcutsArgs): void {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (document.querySelector('[role="dialog"]') !== null) {
        return
      }
      const action = undoShortcut({event})
      if (action !== null) {
        event.preventDefault()
        dispatch({type: action})
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey || isTextField(event.target)) {
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        onFocusSearch()
      } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && insideList(event.target)) {
        event.preventDefault()
        onMoveSelection(event.key === 'ArrowDown' ? 1 : -1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, enabled, onFocusSearch, onMoveSelection])
}
