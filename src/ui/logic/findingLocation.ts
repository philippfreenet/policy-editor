import type {PolicyFile} from '../../model/PolicyTypes.ts'
import {viewTarget} from './viewTarget.ts'

const FIELD_LABEL: Record<string, string> = {
  channels: 'Channels',
  className: 'Klasse',
  condition: 'Bedingung',
  description: 'Beschreibung',
  name: 'Name',
  negation: 'Negation',
  params: 'Parameter',
  roles: 'Rollen',
}

/** Lesbare Ortsangabe eines Befund-Pfads („Recht #4 name · Rollen“); unbekannte Pfade oder Einträge liefern den Pfad unverändert. */
export function findingLocation(args: {path: string; policy: PolicyFile}): string {
  const target = viewTarget({path: args.path})
  if (target === null || target.index === null) {
    return args.path
  }
  const field = target.field === null ? '' : ` · ${FIELD_LABEL[target.field] ?? target.field}`
  if (target.view === 'rights') {
    const right = args.policy.rights[target.index]
    return right === undefined ? args.path : `Recht #${target.index + 1} ${right.name}${field}`
  }
  if (target.view === 'providers') {
    const provider = args.policy.providers[target.index]
    return provider === undefined ? args.path : `Provider ${provider.name}${field}`
  }
  const channel = args.policy.channels[target.index]
  return channel === undefined ? args.path : `Channel ${channel}`
}
