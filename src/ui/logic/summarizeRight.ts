import type {PolicyFile, RightDef} from '../../model/PolicyTypes.ts'
import {conditionProviders} from '../../model/rightQueries.ts'

/** Fasst ein Recht in einer Zeile zusammen: Rollen · Channels · Bedingungen. */
export function summarizeRight(args: {policy: PolicyFile; right: RightDef}): string {
  const {policy, right} = args
  const roles = right.roles.length
  const rolePart = roles === 0 ? 'keine Rolle' : `${roles} ${roles === 1 ? 'Rolle' : 'Rollen'}`

  const channels = right.channels.length
  const coversAll = policy.channels.length > 0 && policy.channels.every((c) => right.channels.includes(c))
  let channelPart: string
  if (coversAll) {
    channelPart = 'alle Channels'
  } else if (channels === 0) {
    channelPart = 'kein Channel'
  } else {
    channelPart = `${channels} ${channels === 1 ? 'Channel' : 'Channels'}`
  }

  let conditionPart = 'immer'
  if (right.condition !== undefined) {
    const count = conditionProviders({node: right.condition}).size
    conditionPart = count === 0 ? 'leere Bedingung' : `${count} ${count === 1 ? 'Bedingung' : 'Bedingungen'}`
  }
  return [rolePart, channelPart, conditionPart].join(' · ')
}
