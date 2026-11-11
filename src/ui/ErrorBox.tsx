interface ErrorBoxProps {
  message: string
  onDismiss: () => void
}

/** Roter, schließbarer Fehlerkasten; wird Screenreadern als Hinweis (role="alert") angekündigt. */
export function ErrorBox({message, onDismiss}: ErrorBoxProps): React.JSX.Element {
  return (
    <div
      className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
      role="alert"
    >
      <p className="flex-1">{message}</p>
      <button
        aria-label="Fehlermeldung schließen"
        className="rounded px-2 text-lg leading-none text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  )
}
