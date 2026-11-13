import {USER_ROLES} from '../../constants.ts'
import {formatCondition} from '../../model/formatCondition.ts'
import type {PolicyFile} from '../../model/PolicyTypes.ts'

/**
 * Rolle, die policy-service ohne Vertrag und ohne Rolle annimmt; für sie gelten verknüpfte Rechte
 * ohne Prüfung der Bedingung.
 */
export const DEFAULT_ROLE = 'INTERESTED_PERSON'

/** gewährt: ohne Provider-Prüfung; bedingt: Provider entscheiden; nicht verfügbar: Kanal oder Rolle fehlt. */
export type AccessStatus = 'conditional' | 'granted' | 'unavailable'

export interface AccessRow {
  /** Bedingung als Formel; nur bei bedingten Rechten. Negierte Provider beschreiben ihr Ergebnis im Namen. */
  formula: string | null
  index: number
  name: string
  /** Grund, warum das Recht nicht verfügbar ist; nur bei nicht verfügbaren Rechten. */
  reason: string | null
  status: AccessStatus
}

/**
 * Ordnet jedes Recht für einen Aufruf mit Kanal und Rolle ein, so wie policy-service es auswertet:
 * Ein Recht ist nur verknüpft, wenn Kanal und Rolle passen. Verknüpfte Rechte ohne Bedingung und alle
 * verknüpften Rechte der Standardrolle gelten sofort; alle übrigen hängen vom Ergebnis der Provider ab.
 */
export function checkAccess(args: {channel: string; policy: PolicyFile; role: string}): AccessRow[] {
  const {channel, policy, role} = args
  return policy.rights.map((right, index) => {
    const base = {formula: null, index, name: right.name, reason: null}
    const hasChannel = right.channels.includes(channel)
    const hasRole = right.roles.includes(role)
    if (!hasChannel || !hasRole) {
      const reason =
        !hasChannel && !hasRole
          ? `Channel ${channel} und Rolle ${role} fehlen`
          : !hasChannel
            ? `Channel ${channel} fehlt`
            : `Rolle ${role} fehlt`
      return {...base, reason, status: 'unavailable'}
    }
    if (right.condition === undefined || role === DEFAULT_ROLE) {
      return {...base, status: 'granted'}
    }
    return {...base, formula: formatCondition({node: right.condition}), status: 'conditional'}
  })
}

/** Die bekannten Rollen in ihrer festen Reihenfolge, danach weitere Rollen aus den Rechten alphabetisch. */
export function knownRoles(args: {policy: PolicyFile}): string[] {
  const extra = new Set(args.policy.rights.flatMap((right) => right.roles).filter((r) => !USER_ROLES.includes(r)))
  return [...USER_ROLES, ...[...extra].sort((a, b) => a.localeCompare(b))]
}
