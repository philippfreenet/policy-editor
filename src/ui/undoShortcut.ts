/** Minimal benötigte Felder eines Tastaturereignisses. */
interface ShortcutEvent {
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
}

const TEXT_INPUT_TYPES = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url'])

/** Prüft, ob das Ziel ein Textfeld ist, das sein eigenes Rückgängig braucht. */
export function isTextField(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null || !('tagName' in target)) {
    return false
  }
  const element = target as {isContentEditable?: boolean; tagName: string; type?: string}
  if (element.tagName === 'TEXTAREA' || element.isContentEditable === true) {
    return true
  }
  return element.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(element.type ?? 'text')
}

/** Ordnet ein Tastaturereignis Rückgängig (Strg/⌘+Z) oder Wiederholen (Strg/⌘+⇧+Z, Strg+Y) zu, sonst null. */
export function undoShortcut(args: {event: ShortcutEvent}): 'redo' | 'undo' | null {
  const {event} = args
  if (!(event.ctrlKey || event.metaKey) || isTextField(event.target)) {
    return null
  }
  const key = event.key.toLowerCase()
  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo'
  }
  if (key === 'y' && event.ctrlKey && !event.shiftKey) {
    return 'redo'
  }
  return null
}
