/** Gemerkter Eintrag einer Liste: Position plus Name, damit er Verschieben und Rückgängig übersteht. */
export interface EntryRef {
  index: number | null
  /** null, solange der Name noch nicht bekannt ist (z. B. direkt nach dem Anlegen oder Verschieben). */
  name: string | null
}

/**
 * Findet den gemerkten Eintrag in der aktuellen Liste wieder.
 * Vorrang hat der Name (Eintrag wurde verschoben), sonst die Position (Eintrag wurde umbenannt);
 * liegt die Position außerhalb der Liste, ist nichts ausgewählt.
 */
export function resolveEntry(args: {entry: EntryRef; items: readonly {name: string}[]}): EntryRef {
  const {entry, items} = args
  if (entry.index === null) {
    return {index: null, name: null}
  }
  const atIndex = items[entry.index]
  if (entry.name !== null && atIndex?.name !== entry.name) {
    const found = items.findIndex((item) => item.name === entry.name)
    if (found !== -1) {
      return {index: found, name: entry.name}
    }
  }
  return atIndex === undefined ? {index: null, name: null} : {index: entry.index, name: atIndex.name}
}
