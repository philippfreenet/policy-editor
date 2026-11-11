import {useEffect, useId, useRef, useState} from 'react'

interface InlineEditProps {
  ariaLabel: string
  /** Fehlermeldung unter dem Feld; hält das Feld nach einem abgelehnten Commit offen. */
  error?: string | null
  mono?: boolean
  multiline?: false
  onCommit: (value: string) => void
  placeholder?: string
  size?: 'lg' | 'md'
  value: string
}

/** Text, der per Klick oder Enter zum Eingabefeld wird; Enter/Blur übernimmt, Escape verwirft. */
export function InlineEdit({
  ariaLabel,
  error = null,
  mono = false,
  onCommit,
  placeholder = '',
  size = 'md',
  value,
}: InlineEditProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  /* Verhindert doppelte Commits, wenn Enter/Escape das Feld entfernt und der Browser dabei blur meldet. */
  const settledRef = useRef(false)
  const committedRef = useRef<string | null>(null)
  const errorId = useId()

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  /* Lehnt der Aufrufer den Wert ab (error gesetzt), bleibt das Feld mit dem Entwurf offen. */
  useEffect(() => {
    if (error !== null && committedRef.current !== null) {
      settledRef.current = false
      setEditing(true)
    }
  }, [error])

  const textClass = `${size === 'lg' ? 'text-base font-semibold' : ''} ${mono ? 'font-mono' : ''}`

  /** Öffnet das Feld mit dem aktuellen Wert als Entwurf. */
  function open(): void {
    settledRef.current = false
    committedRef.current = null
    setDraft(value)
    setEditing(true)
  }

  /** Übernimmt den Entwurf, falls er sich vom Wert unterscheidet. */
  function commit(): void {
    if (settledRef.current) {
      return
    }
    settledRef.current = true
    setEditing(false)
    if (draft !== value) {
      committedRef.current = draft
      onCommit(draft)
    }
  }

  /** Verwirft den Entwurf. */
  function discard(): void {
    settledRef.current = true
    committedRef.current = null
    setEditing(false)
  }

  return (
    <div className="min-w-0">
      {editing ? (
        <input
          aria-describedby={error === null ? undefined : errorId}
          aria-invalid={error === null ? undefined : true}
          aria-label={ariaLabel}
          className={`min-h-6 w-full rounded border bg-canvas px-1 text-fg outline-accent focus-visible:outline-2 ${error === null ? 'border-line-strong' : 'border-danger'} ${textClass}`}
          onBlur={() => {
            /* Nach einer Ablehnung ohne neue Eingabe schließt Blur nur, statt erneut abzulehnen. */
            if (error !== null && draft === committedRef.current) {
              discard()
            } else {
              commit()
            }
          }}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              discard()
            }
          }}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={draft}
        />
      ) : (
        <button
          aria-label={ariaLabel}
          className={`-mx-1 min-h-6 max-w-full rounded px-1 text-left break-words outline-accent hover:bg-sidebar focus-visible:outline-2 ${value === '' ? 'text-muted' : 'text-fg'} ${textClass}`}
          onClick={open}
          type="button"
        >
          {value === '' ? placeholder : value}
        </button>
      )}
      {error !== null && (
        <p className="mt-1 break-words text-danger" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
