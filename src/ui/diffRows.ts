import {diffLines} from 'diff'

/** Eine Zeile der Diff-Darstellung; `collapsed` fasst `count` unveränderte Zeilen zusammen. */
export interface DiffRow {
  count: number
  kind: 'added' | 'collapsed' | 'context' | 'removed'
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
  for (const part of diffLines(args.original, args.current)) {
    const kind = part.added ? 'added' : part.removed ? 'removed' : 'context'
    for (const text of splitLines({value: part.value})) {
      flat.push({count: 1, kind, text})
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
      rows.push({count: 1, kind: 'collapsed', text: ''})
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
