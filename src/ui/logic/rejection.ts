import {OperationError} from '../../model/operations.ts'

/**
 * Führt eine reine Operation zur Vorprüfung aus. Eine abgelehnte Operation (`OperationError`) liefert ihre
 * Meldung, sonst `null`; alle anderen Fehler werden weitergereicht.
 */
export function rejection(args: {run: () => unknown}): string | null {
  try {
    args.run()
  } catch (error) {
    if (error instanceof OperationError) {
      return error.message
    }
    throw error
  }
  return null
}
