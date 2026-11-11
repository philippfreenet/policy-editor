import {useEffect, useRef} from 'react'

interface ToastProps {
  /** Anzuzeigende Meldung; `null` blendet aus. */
  message: string | null
  /** Wird aufgerufen, sobald die Meldung nach 3 s verschwinden soll. */
  onDone: () => void
  /** Ändert sich bei jedem erneuten Zeigen derselben Meldung und startet die 3 s neu. */
  showId?: number
}

const TOAST_MS = 3000

/** Flüchtige Statusmeldung (Live-Region); meldet sich nach 3 s über `onDone` ab. */
export function Toast({message, onDone, showId}: ToastProps): React.JSX.Element {
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (message === null) {
      return undefined
    }
    const timer = setTimeout(() => {
      doneRef.current()
    }, TOAST_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [message, showId])

  return (
    <div
      className={
        message === null
          ? 'sr-only'
          : 'fixed right-4 bottom-4 z-50 max-w-sm rounded border border-line-strong bg-surface px-3 py-2 break-words text-fg'
      }
      role="status"
    >
      {message}
    </div>
  )
}
