import {useState} from 'react'
import {INPUT} from './styles.ts'

interface NameInputProps {
  id?: string
  label: string
  onCommit: (value: string) => void
  value: string
}

/** Textfeld mit lokalem Entwurf: Übernahme bei Enter oder Verlassen des Feldes, Escape verwirft den Entwurf. */
export function NameInput({id, label, onCommit, value}: NameInputProps): React.JSX.Element {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (lastValue !== value) {
    setLastValue(value)
    setDraft(value)
  }

  /** Meldet den Entwurf, sofern er sich vom gespeicherten Wert unterscheidet. */
  function commit(): void {
    if (draft !== value) {
      onCommit(draft)
    }
  }

  return (
    <input
      aria-label={id === undefined ? label : undefined}
      className={`${INPUT} min-w-0 font-mono`}
      id={id}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          setDraft(value)
        }
      }}
      type="text"
      value={draft}
    />
  )
}
