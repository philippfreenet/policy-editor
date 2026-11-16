import {diffLines} from 'diff'

/** Eine Zeile der Diff-Darstellung; `collapsed` fasst `count` unveränderte Zeilen zusammen. */
export interface DiffRow {
  count: number
  kind: 'added' | 'collapsed' | 'context' | 'removed'
  /** Zeilennummer im aktuellen Text; null bei entfernten und zusammengefassten Zeilen. */
  newNo: number | null
  /** Zeilennummer im Original; null bei hinzugefügten und zusammengefassten Zeilen. */
  oldNo: number | null
  text: string
}

/** Zerlegt einen Textblock in Zeilen, ohne den leeren Rest nach dem letzten Zeilenumbruch. */
function splitLines(args: {value: string}): string[] {
  const lines = args.value.split('\n')
  if (lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

/** Zeilenweiser Diff; unveränderte Zeilen weiter als `context` Zeilen von einer Änderung entfernt werden zusammengefasst. */
export function buildDiffRows(args: {context: number; current: string; original: string}): DiffRow[] {
  const flat: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  for (const part of diffLines(args.original, args.current)) {
    const kind = part.added ? 'added' : part.removed ? 'removed' : 'context'
    for (const text of splitLines({value: part.value})) {
      if (kind !== 'added') {
        oldNo++
      }
      if (kind !== 'removed') {
        newNo++
      }
      flat.push({
        count: 1,
        kind,
        newNo: kind === 'removed' ? null : newNo,
        oldNo: kind === 'added' ? null : oldNo,
        text,
      })
    }
  }
  const keep = flat.map((row) => row.kind !== 'context')
  flat.forEach((row, i) => {
    if (row.kind === 'context') {
      return
    }
    for (let j = Math.max(0, i - args.context); j <= Math.min(flat.length - 1, i + args.context); j++) {
      keep[j] = true
    }
  })
  const rows: DiffRow[] = []
  flat.forEach((row, i) => {
    if (keep[i]) {
      rows.push(row)
      return
    }
    const last = rows[rows.length - 1]
    if (last !== undefined && last.kind === 'collapsed') {
      last.count += 1
    } else {
      rows.push({count: 1, kind: 'collapsed', newNo: null, oldNo: null, text: ''})
    }
  })
  return rows
}

/** True, wenn der Diff keine hinzugefügten oder entfernten Zeilen enthält. */
export function isUnchanged(args: {rows: DiffRow[]}): boolean {
  return args.rows.every((row) => row.kind === 'context' || row.kind === 'collapsed')
}

/** Anzahl der hinzugefügten und entfernten Zeilen des aktuellen Texts gegenüber dem Original; ohne Original zählt jede Zeile als neu. */
export function countChangedLines(args: {current: string; original: string | null}): number {
  const rows = buildDiffRows({context: 0, current: args.current, original: args.original ?? ''})
  return rows.filter((row) => row.kind === 'added' || row.kind === 'removed').length
}

/** Eine Zeile der Nebeneinander-Ansicht: links das Original, rechts der aktuelle Stand; null lässt die Seite leer. */
export type SplitRow =
  | {count: number; kind: 'collapsed'}
  | {
      kind: 'pair'
      left: {kind: 'context' | 'removed'; no: number | null; text: string} | null
      right: {kind: 'added' | 'context'; no: number | null; text: string} | null
    }

/** Ordnet aufeinanderfolgende entfernte und hinzugefügte Zeilen paarweise nebeneinander an. */
export function toSplitRows(args: {rows: DiffRow[]}): SplitRow[] {
  const result: SplitRow[] = []
  let removed: DiffRow[] = []
  let added: DiffRow[] = []
  const flush = (): void => {
    const length = Math.max(removed.length, added.length)
    for (let i = 0; i < length; i++) {
      const left = removed[i]
      const right = added[i]
      result.push({
        kind: 'pair',
        left: left === undefined ? null : {kind: 'removed', no: left.oldNo, text: left.text},
        right: right === undefined ? null : {kind: 'added', no: right.newNo, text: right.text},
      })
    }
    removed = []
    added = []
  }
  for (const row of args.rows) {
    if (row.kind === 'removed') {
      removed.push(row)
    } else if (row.kind === 'added') {
      added.push(row)
    } else {
      flush()
      result.push(
        row.kind === 'collapsed'
          ? {count: row.count, kind: 'collapsed'}
          : {
              kind: 'pair',
              left: {kind: 'context', no: row.oldNo, text: row.text},
              right: {kind: 'context', no: row.newNo, text: row.text},
            },
      )
    }
  }
  flush()
  return result
}
