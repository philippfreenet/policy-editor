import {readFileSync} from 'node:fs'
import type {PolicyFile} from '../../src/model/PolicyTypes.ts'
import {parsePolicy} from '../../src/model/parse.ts'

/** Text der Produktiv-Fixture. */
export const FIXTURE_TEXT = readFileSync(new URL('../fixtures/policy-prod.json', import.meta.url), 'utf8')

/** Liest die Produktiv-Fixture über den echten Parser als frische Policy. */
export function loadFixturePolicy(): PolicyFile {
  const result = parsePolicy({text: FIXTURE_TEXT})
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.policy
}
