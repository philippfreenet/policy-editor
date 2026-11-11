import {Description, Dialog, DialogPanel, DialogTitle} from '@headlessui/react'
import {useRef} from 'react'

interface ConfirmDialogProps {
  children: React.ReactNode
  confirmLabel: string
  /** Sperrt den Bestätigen-Knopf, solange die Eingabe im Dialog ungültig ist. */
  confirmDisabled?: boolean
  /** Färbt den Bestätigen-Knopf als gefährliche Aktion. */
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

/** Bestätigungsdialog; der Fokus startet auf „Abbrechen“ und kehrt beim Schließen zum Auslöser zurück. */
export function ConfirmDialog({
  children,
  confirmDisabled = false,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog className="relative z-40" initialFocus={cancelRef} onClose={onCancel} open={open}>
      <div aria-hidden="true" className="fixed inset-0 bg-scrim" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded border border-line-strong bg-surface p-4 text-fg">
          <DialogTitle className="text-base font-semibold break-words">{title}</DialogTitle>
          <Description as="div" className="mt-2 break-words text-muted">
            {children}
          </Description>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="min-h-6 rounded border border-line-strong px-3 py-1 outline-accent focus-visible:outline-2"
              onClick={onCancel}
              ref={cancelRef}
              type="button"
            >
              Abbrechen
            </button>
            <button
              className={`min-h-6 rounded px-3 py-1 outline-accent focus-visible:outline-2 disabled:opacity-50 ${danger ? 'bg-danger text-canvas' : 'bg-accent text-on-accent'}`}
              disabled={confirmDisabled}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
