import {parsePolicy} from '../model/parse.ts'

/** True, wenn der Text als policy.json geladen werden kann; nur dann darf die Ladeansicht schließen. */
export function loadSucceeds(args: {text: string}): boolean {
  return parsePolicy({text: args.text}).ok
}
