import {useEffect, useId, useRef, useState} from 'react'

interface InlineEditProps {
  ariaLabel: string
  mono?: boolean
  multiline?: false
  /** Übernimmt den Wert; liefert `null` bei Annahme oder eine Fehlermeldung bei Ablehnung. */
  onCommit: (value: string) => string | null
  placeholder?: string
  /** Startet im Bearbeitungsmodus (nur beim Einblenden wirksam), z. B. für frisch angelegte Einträge. */
  startEditing?: boolean
  size?: 'lg' | 'md'
  value: string
}

/**
 * Text, der per Klick oder Enter zum Eingabefeld wird. Enter/Blur übernimmt über `onCommit`;
 * eine zurückgegebene Meldung hält das Feld mit dem Entwurf offen. Escape verwirft.
 */
export function InlineEdit({
  ariaLabel,
  mono = false,
  onCommit,
  placeholder = '',
  startEditing = false,
  size = 'md',
  value,
}: InlineEditProps): React.JSX.Element {
  const [editing, setEditing] = useState(startEditing)
  const [draft, setDraft] = useState(value)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const textClass = `${size === 'lg' ? 'text-base font-semibold' : ''} ${mono ? 'font-mono' : ''}`
  const shown = value === '' ? placeholder : value

  /** Schließt das Feld und löscht die Meldung. */
  function close(): void {
    setMessage(null)
    setEditing(false)
  }

  /** Übernimmt den Entwurf, falls er sich vom Wert unterscheidet; bei Ablehnung bleibt das Feld offen. */
  function commit(): void {
    if (draft === value) {
      close()
      return
    }
    const rejection = onCommit(draft)
    if (rejection === null) {
      close()
    } else {
      setMessage(rejection)
    }
  }

  return (
    <div className="min-w-0">
      {editing ? (
        <input
          aria-describedby={message === null ? undefined : errorId}
          aria-invalid={message === null ? undefined : true}
          aria-label={ariaLabel}
          className={`min-h-6 w-full rounded border bg-canvas px-1 text-fg outline-accent focus-visible:outline-2 ${message === null ? 'border-line-strong' : 'border-danger'} ${textClass}`}
          onBlur={commit}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              /* Das Entfernen des Felds löst kein Blur-Commit mehr aus, weil der Entwurf zuerst zurückgesetzt wird. */
              setDraft(value)
              close()
            }
          }}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={draft}
        />
      ) : (
        <button
          aria-label={`${ariaLabel}: ${shown}`}
          className={`-mx-1 min-h-6 max-w-full rounded px-1 text-left break-words outline-accent hover:bg-sidebar focus-visible:outline-2 ${value === '' ? 'text-muted' : 'text-fg'} ${textClass}`}
          onClick={() => {
            setDraft(value)
            setMessage(null)
            setEditing(true)
          }}
          type="button"
        >
          {shown}
        </button>
      )}
      {message !== null && (
        <p className="mt-1 break-words text-danger" id={errorId} role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
