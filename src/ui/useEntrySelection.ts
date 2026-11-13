import {useCallback, useEffect, useState} from 'react'
import {resolveEntry} from './logic/resolveEntry.ts'
import type {EntryRef} from './logic/resolveEntry.ts'

/** Was eine Listen-Ansicht über ihren Abbau hinaus behält. */
export interface StoredEntry {
  entry: EntryRef
  filters: Filters
  text: string
}

/** Ablage je Ansicht; lebt in der App, damit Auswahl und Suche den Wechsel der Ansicht überstehen. */
export type EntryStore = Map<string, StoredEntry>

/** Von außen angeforderter Sprung (Befund, Übersicht); ein neues Objekt bedeutet einen neuen Sprung. */
export interface EntryJump {
  field: string | null
  index: number | null
}

type Filters = Readonly<Record<string, string | null>>

interface EntrySelection<F extends Filters> {
  clearJump: () => void
  filters: F
  jumpField: string | null
  open: number | null
  select: (index: number | null) => void
  setFilters: (update: (filters: F) => F) => void
  setText: (text: string | ((text: string) => string)) => void
  text: string
}

const NO_ENTRY: EntryRef = {index: null, name: null}

/**
 * Gemeinsame Auswahl-Logik der Listen-Ansichten: geöffneter Eintrag, Suchtext, Filter und Feldsprung.
 * Der Eintrag wird über Position und Name gemerkt, damit Verschieben, Rückgängig und Wiederherstellen
 * ihn nicht auf einen anderen Eintrag umlenken.
 */
export function useEntrySelection<F extends Filters>(args: {
  emptyFilters: F
  items: readonly {name: string}[]
  jump: EntryJump | null
  store: EntryStore | undefined
  storeKey: string
}): EntrySelection<F> {
  const {emptyFilters, items, jump, store, storeKey} = args
  const stored = store?.get(storeKey)
  /* Ein beim Aufbau anstehender Sprung hat Vorrang vor dem gemerkten Stand */
  const jumping = jump?.index !== null && jump?.index !== undefined
  const [entry, setEntry] = useState<EntryRef>(() =>
    jumping ? {index: jump.index, name: null} : (stored?.entry ?? NO_ENTRY),
  )
  const [text, setText] = useState(() => (jumping ? '' : (stored?.text ?? '')))
  /* Die Ablage kennt nur die eigene Ansicht, deshalb passt die Form der Filter */
  const [filters, setFilters] = useState<F>(() =>
    jumping ? emptyFilters : ((stored?.filters as F | undefined) ?? emptyFilters),
  )
  const [lastJump, setLastJump] = useState(jump)
  const [jumpField, setJumpField] = useState<string | null>(jump?.field ?? null)

  /* Ein neuer Sprung öffnet den Eintrag und zeigt ihn ungefiltert */
  if (jump !== lastJump) {
    setLastJump(jump)
    if (jump?.index !== null && jump?.index !== undefined) {
      setEntry({index: jump.index, name: null})
      setJumpField(jump.field)
      setText('')
      setFilters(emptyFilters)
    }
  }

  /* Nach Verschieben, Umbenennen oder Rückgängig den Eintrag in der aktuellen Liste wiederfinden */
  const resolved = resolveEntry({entry, items})
  if (resolved.index !== entry.index || resolved.name !== entry.name) {
    setEntry(resolved)
  }

  useEffect(() => {
    store?.set(storeKey, {entry: {index: resolved.index, name: resolved.name}, filters, text})
  }, [filters, resolved.index, resolved.name, store, storeKey, text])

  const select = useCallback((index: number | null): void => setEntry({index, name: null}), [])
  const clearJump = useCallback((): void => setJumpField(null), [])

  return {clearJump, filters, jumpField, open: resolved.index, select, setFilters, setText, text}
}
