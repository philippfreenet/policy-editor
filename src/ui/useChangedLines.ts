import {useEffect, useState} from 'react'

/** Ergebnis einer Berechnung samt den Eingaben, für die es gilt. */
interface Counted {
  count: number
  current: string
  original: string | null
}

/**
 * Zählt die geänderten Zeilen (hinzugefügt + entfernt) gegenüber der geladenen Datei.
 * Das Diff-Modul wird erst beim ersten Aufruf nachgeladen, damit es nicht im Start-Bundle liegt;
 * bis das Ergebnis für die aktuellen Eingaben vorliegt, kommt null zurück.
 */
export function useChangedLines(args: {current: string; original: string | null}): number | null {
  const {current, original} = args
  const [counted, setCounted] = useState<Counted | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('./diffRows.ts').then(({countChangedLines}) => {
      if (!cancelled) {
        setCounted({count: countChangedLines({current, original}), current, original})
      }
    })
    return () => {
      cancelled = true
    }
  }, [current, original])

  /* Ein Ergebnis zu älteren Eingaben gilt nicht mehr, bis die Neuberechnung fertig ist */
  return counted !== null && counted.current === current && counted.original === original ? counted.count : null
}
