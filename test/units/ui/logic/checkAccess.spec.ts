import {expect} from 'chai'
import {USER_ROLES} from '../../../../src/constants.ts'
import type {PolicyFile, RightDef} from '../../../../src/model/PolicyTypes.ts'
import {checkAccess, DEFAULT_ROLE, knownRoles} from '../../../../src/ui/logic/checkAccess.ts'

const right = (name: string, extra?: Partial<RightDef>): RightDef => ({
  channels: ['WEB'],
  description: '',
  name,
  roles: ['KUNDE', DEFAULT_ROLE],
  ...extra,
})

const policy: PolicyFile = {
  channels: ['WEB', 'APP'],
  providers: [
    {className: 'X', name: 'Aktiv'},
    {className: 'X', name: 'Gesperrt', negation: true},
  ],
  rights: [
    right('Statisch'),
    right('Bedingt', {condition: {conditions: ['Aktiv', 'Gesperrt'], operator: 'AND'}}),
    right('NurApp', {channels: ['APP']}),
    right('NurAdmin', {roles: ['ADMIN']}),
    right('Fremd', {channels: ['APP'], roles: ['ADMIN']}),
  ],
}

describe('checkAccess', () => {
  it('Erfolg: Recht ohne Bedingung mit passendem Channel und passender Rolle ist gewährt', () => {
    const [row] = checkAccess({channel: 'WEB', policy, role: 'KUNDE'})
    expect(row).to.deep.equal({formula: null, index: 0, name: 'Statisch', reason: null, status: 'granted'})
  })

  it('Erfolg: Recht mit Bedingung hängt von den Providern ab und zeigt die Bedingung als Formel', () => {
    const row = checkAccess({channel: 'WEB', policy, role: 'KUNDE'})[1]
    expect(row?.status).to.equal('conditional')
    expect(row?.formula).to.equal('Aktiv AND Gesperrt')
  })

  it('Erfolg: die Standardrolle bekommt verknüpfte Rechte auch mit Bedingung sofort', () => {
    const row = checkAccess({channel: 'WEB', policy, role: DEFAULT_ROLE})[1]
    expect(row?.status).to.equal('granted')
    expect(row?.formula).to.equal(null)
  })

  it('Fehlschlag: fehlender Channel, fehlende Rolle oder beides wird als Grund genannt', () => {
    const rows = checkAccess({channel: 'WEB', policy, role: 'KUNDE'})
    expect(rows.slice(2).map((r) => [r.status, r.reason])).to.deep.equal([
      ['unavailable', 'Channel WEB fehlt'],
      ['unavailable', 'Rolle KUNDE fehlt'],
      ['unavailable', 'Channel WEB und Rolle KUNDE fehlen'],
    ])
  })

  it('Fehlschlag: auch die Standardrolle braucht die Verknüpfung über die Rolle', () => {
    const row = checkAccess({channel: 'WEB', policy, role: DEFAULT_ROLE})[3]
    expect(row?.status).to.equal('unavailable')
  })
})

describe('knownRoles', () => {
  it('Erfolg: bekannte Rollen zuerst, weitere Rollen der Rechte alphabetisch und eindeutig dahinter', () => {
    expect(knownRoles({policy})).to.deep.equal([...USER_ROLES, 'ADMIN', 'KUNDE'])
  })

  it('Erfolg: ohne Rechte bleiben die bekannten Rollen wählbar, darunter die Standardrolle', () => {
    expect(knownRoles({policy: {channels: [], providers: [], rights: []}})).to.include(DEFAULT_ROLE)
  })
})
