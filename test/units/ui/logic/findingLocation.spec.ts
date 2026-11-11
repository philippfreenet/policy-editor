import {expect} from 'chai'
import type {PolicyFile} from '../../../../src/model/PolicyTypes.ts'
import {findingLocation} from '../../../../src/ui/logic/findingLocation.ts'

const POLICY: PolicyFile = {
  channels: ['FREENET', 'MD'],
  providers: [{className: 'ContractStates', name: 'Aktiv'}],
  rights: [
    {channels: [], name: 'A', description: '', roles: []},
    {channels: [], name: 'B', description: '', roles: []},
    {channels: [], name: 'C', description: '', roles: []},
    {channels: [], name: 'Vierte', description: '', roles: ['admin']},
  ],
}

describe('findingLocation', () => {
  it('Erfolg: Recht mit Feld zeigt ID, Name und deutsches Feld', () => {
    expect(findingLocation({path: 'rights[3].roles', policy: POLICY})).to.equal('Recht #4 Vierte · Rollen')
    expect(findingLocation({path: 'rights[3].condition.operands[0]', policy: POLICY})).to.equal(
      'Recht #4 Vierte · Bedingung',
    )
  })

  it('Erfolg: Recht ohne Feld zeigt nur ID und Name', () => {
    expect(findingLocation({path: 'rights[0]', policy: POLICY})).to.equal('Recht #1 A')
  })

  it('Erfolg: Provider und Channel mit Namen', () => {
    expect(findingLocation({path: 'providers[0].className', policy: POLICY})).to.equal('Provider Aktiv · Klasse')
    expect(findingLocation({path: 'providers[0].params[1].values', policy: POLICY})).to.equal(
      'Provider Aktiv · Parameter',
    )
    expect(findingLocation({path: 'channels[1]', policy: POLICY})).to.equal('Channel MD')
  })

  it('Fehlschlag: unbekannter Pfad oder fehlender Eintrag liefert den rohen Pfad', () => {
    expect(findingLocation({path: 'sonstiges', policy: POLICY})).to.equal('sonstiges')
    expect(findingLocation({path: 'rights', policy: POLICY})).to.equal('rights')
    expect(findingLocation({path: 'rights[9].name', policy: POLICY})).to.equal('rights[9].name')
    expect(findingLocation({path: 'providers[5].name', policy: POLICY})).to.equal('providers[5].name')
    expect(findingLocation({path: 'channels[7]', policy: POLICY})).to.equal('channels[7]')
  })

  it('Erfolg: unbekanntes Feld bleibt unübersetzt', () => {
    expect(findingLocation({path: 'rights[0].foo', policy: POLICY})).to.equal('Recht #1 A · foo')
  })
})
