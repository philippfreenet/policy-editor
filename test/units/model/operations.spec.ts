import {expect} from 'chai'
import {OperationError} from '../../../src/model/OperationError.ts'
import {
  addChannel,
  deleteChannel,
  deleteProvider,
  deleteRight,
  findChannelUsages,
  findProviderUsages,
  moveRight,
  renameChannel,
  renameProvider,
  upsertProvider,
  upsertRight,
} from '../../../src/model/operations.ts'
import type {PolicyFile, ProviderDef, RightDef} from '../../../src/model/PolicyTypes.ts'

/** Liefert eine frische Policy mit dreistufig verschachtelter Bedingung. */
function basePolicy(): PolicyFile {
  return {
    channels: ['A', 'B', 'C'],
    providers: [
      {className: 'MarkProvider', name: 'p1', negation: false},
      {className: 'MNPProvider', name: 'p2', negation: false},
      {className: 'NetworkProvider', name: 'p3', negation: true},
    ],
    rights: [
      {
        channels: ['A', 'B'],
        condition: {
          conditions: ['p1', {conditions: ['p2', {conditions: ['p1', 'p3'], operator: 'OR'}], operator: 'AND'}],
          operator: 'AND',
        },
        description: 'd1',
        name: 'r1',
        roles: ['SYSTEM'],
      },
      {channels: ['B'], description: 'd2', name: 'r2', roles: ['PRODUCT_OWNER']},
      {channels: ['A'], condition: {conditions: ['p3'], operator: 'AND'}, description: 'd3', name: 'r3', roles: []},
    ],
  }
}

/** Führt die Funktion aus und liefert den geworfenen OperationError. */
function catchError(args: {fn: () => unknown}): OperationError {
  try {
    args.fn()
  } catch (error) {
    expect(error).to.be.instanceOf(OperationError)
    return error as OperationError
  }
  throw new Error('Es wurde kein Fehler geworfen')
}

describe('operations', () => {
  describe('Verwendungssuche', () => {
    it('Erfolg: findet Rechte eines Channels aufsteigend', () => {
      expect(findChannelUsages({channel: 'B', policy: basePolicy()})).to.deep.equal([0, 1])
    })

    it('Erfolg: findet Provider in jeder Tiefe, eindeutig und aufsteigend', () => {
      expect(findProviderUsages({name: 'p1', policy: basePolicy()})).to.deep.equal([0])
      expect(findProviderUsages({name: 'p3', policy: basePolicy()})).to.deep.equal([0, 2])
    })

    it('Erfolg: liefert leere Liste ohne Verwendung', () => {
      expect(findProviderUsages({name: 'x', policy: basePolicy()})).to.deep.equal([])
      expect(findChannelUsages({channel: 'x', policy: basePolicy()})).to.deep.equal([])
    })
  })

  describe('Channels', () => {
    it('Erfolg: neuer Channel wird angehängt', () => {
      expect(addChannel({channel: 'D', policy: basePolicy()}).channels).to.deep.equal(['A', 'B', 'C', 'D'])
    })

    it('Fehlschlag: lehnt vorhandenen Channel ab', () => {
      expect(catchError({fn: () => addChannel({channel: 'A', policy: basePolicy()})}).message).to.equal(
        'Channel A existiert bereits',
      )
    })

    it('Fehlschlag: lehnt leeren Channel-Namen ab', () => {
      expect(catchError({fn: () => addChannel({channel: '  ', policy: basePolicy()})}).message).to.equal(
        'Name darf nicht leer sein',
      )
    })

    it('Erfolg: Umbenennen eines Channels ändert alle Rechte', () => {
      const result = renameChannel({from: 'B', policy: basePolicy(), to: 'Z'})
      expect(result.channels).to.deep.equal(['A', 'Z', 'C'])
      expect(result.rights[0]?.channels).to.deep.equal(['A', 'Z'])
      expect(result.rights[1]?.channels).to.deep.equal(['Z'])
      expect(result.rights[2]?.channels).to.deep.equal(['A'])
    })

    it('Erfolg: Umbenennen auf den identischen Namen ändert nichts', () => {
      expect(renameChannel({from: 'B', policy: basePolicy(), to: 'B'})).to.deep.equal(basePolicy())
    })

    it('Fehlschlag: lehnt Umbenennung auf vorhandenen Channel ab', () => {
      expect(catchError({fn: () => renameChannel({from: 'A', policy: basePolicy(), to: 'B'})}).message).to.equal(
        'Channel B existiert bereits',
      )
    })

    it('Fehlschlag: lehnt Umbenennung eines unbekannten Channels ab', () => {
      expect(catchError({fn: () => renameChannel({from: 'X', policy: basePolicy(), to: 'Y'})}).message).to.equal(
        'Channel X existiert nicht',
      )
    })

    it('Fehlschlag: lehnt Umbenennung auf leeren Namen ab', () => {
      expect(catchError({fn: () => renameChannel({from: 'A', policy: basePolicy(), to: ''})}).message).to.equal(
        'Name darf nicht leer sein',
      )
    })

    it('Erfolg: unbenutzter Channel wird gelöscht', () => {
      const policy = basePolicy()
      policy.rights = policy.rights.filter((right) => !right.channels.includes('C'))
      expect(deleteChannel({channel: 'C', policy}).channels).to.deep.equal(['A', 'B'])
    })

    it('Fehlschlag: Löschen eines verwendeten Channels wird abgelehnt', () => {
      expect(catchError({fn: () => deleteChannel({channel: 'B', policy: basePolicy()})}).message).to.equal(
        'Channel B wird noch von 2 Recht(en) verwendet',
      )
    })

    it('Fehlschlag: Löschen eines unbekannten Channels wird abgelehnt', () => {
      expect(catchError({fn: () => deleteChannel({channel: 'X', policy: basePolicy()})}).message).to.equal(
        'Channel X existiert nicht',
      )
    })
  })

  describe('Provider', () => {
    it('Erfolg: Umbenennen eines Providers ändert Referenzen in jeder Tiefe', () => {
      const result = renameProvider({from: 'p1', policy: basePolicy(), to: 'neu'})
      expect(result.providers.map((provider) => provider.name)).to.deep.equal(['neu', 'p2', 'p3'])
      expect(result.rights[0]?.condition).to.deep.equal({
        conditions: ['neu', {conditions: ['p2', {conditions: ['neu', 'p3'], operator: 'OR'}], operator: 'AND'}],
        operator: 'AND',
      })
      expect(result.rights[2]?.condition).to.deep.equal({conditions: ['p3'], operator: 'AND'})
    })

    it('Erfolg: Umbenennen auf den identischen Namen ändert nichts', () => {
      expect(renameProvider({from: 'p1', policy: basePolicy(), to: 'p1'})).to.deep.equal(basePolicy())
    })

    it('Fehlschlag: lehnt Umbenennung auf vorhandenen Provider ab', () => {
      expect(catchError({fn: () => renameProvider({from: 'p1', policy: basePolicy(), to: 'p2'})}).message).to.equal(
        'Provider p2 existiert bereits',
      )
    })

    it('Fehlschlag: lehnt Umbenennung eines unbekannten Providers ab', () => {
      expect(catchError({fn: () => renameProvider({from: 'x', policy: basePolicy(), to: 'y'})}).message).to.equal(
        'Provider x existiert nicht',
      )
    })

    it('Fehlschlag: lehnt Umbenennung auf leeren Namen ab', () => {
      expect(catchError({fn: () => renameProvider({from: 'p1', policy: basePolicy(), to: ' '})}).message).to.equal(
        'Name darf nicht leer sein',
      )
    })

    it('Erfolg: neuer Provider wird angehängt', () => {
      const provider: ProviderDef = {className: 'VvlProvider', name: 'p4'}
      const result = upsertProvider({index: null, policy: basePolicy(), provider})
      expect(result.providers).to.have.length(4)
      expect(result.providers[3]).to.deep.equal(provider)
    })

    it('Fehlschlag: lehnt neuen Provider mit vorhandenem Namen ab', () => {
      const provider: ProviderDef = {className: 'VvlProvider', name: 'p2'}
      expect(catchError({fn: () => upsertProvider({index: null, policy: basePolicy(), provider})}).message).to.equal(
        'Provider p2 existiert bereits',
      )
    })

    it('Fehlschlag: lehnt Provider mit leerem Namen ab', () => {
      const provider: ProviderDef = {className: 'VvlProvider', name: ''}
      expect(catchError({fn: () => upsertProvider({index: null, policy: basePolicy(), provider})}).message).to.equal(
        'Name darf nicht leer sein',
      )
    })

    it('Erfolg: Ändern ohne Namenswechsel ersetzt die Felder', () => {
      const provider: ProviderDef = {className: 'VvlProvider', description: 'neu', name: 'p2'}
      const result = upsertProvider({index: 1, policy: basePolicy(), provider})
      expect(result.providers[1]).to.deep.equal(provider)
      expect(result.rights).to.deep.equal(basePolicy().rights)
    })

    it('Erfolg: Ändern mit Namenswechsel aktualisiert die Referenzen', () => {
      const provider: ProviderDef = {className: 'MarkProvider', name: 'neu', negation: true}
      const result = upsertProvider({index: 0, policy: basePolicy(), provider})
      expect(result.providers[0]).to.deep.equal(provider)
      expect(findProviderUsages({name: 'neu', policy: result})).to.deep.equal([0])
      expect(findProviderUsages({name: 'p1', policy: result})).to.deep.equal([])
    })

    it('Fehlschlag: Ändern mit Namenswechsel auf vorhandenen Namen wird abgelehnt', () => {
      const provider: ProviderDef = {className: 'MarkProvider', name: 'p2'}
      expect(catchError({fn: () => upsertProvider({index: 0, policy: basePolicy(), provider})}).message).to.equal(
        'Provider p2 existiert bereits',
      )
    })

    it('Fehlschlag: Ändern mit ungültigem Index wird abgelehnt', () => {
      const provider: ProviderDef = {className: 'MarkProvider', name: 'p1'}
      expect(catchError({fn: () => upsertProvider({index: 9, policy: basePolicy(), provider})}).message).to.equal(
        'Ungültige Position',
      )
    })

    it('Erfolg: unbenutzter Provider wird gelöscht', () => {
      const policy = basePolicy()
      policy.providers.push({className: 'VvlProvider', name: 'p4'})
      expect(deleteProvider({index: 3, policy}).providers).to.have.length(3)
    })

    it('Fehlschlag: Löschen eines verwendeten Providers wird abgelehnt', () => {
      expect(catchError({fn: () => deleteProvider({index: 2, policy: basePolicy()})}).message).to.equal(
        'Provider p3 wird noch von 2 Recht(en) verwendet',
      )
    })

    it('Fehlschlag: Löschen mit ungültigem Index wird abgelehnt', () => {
      expect(catchError({fn: () => deleteProvider({index: -1, policy: basePolicy()})}).message).to.equal(
        'Ungültige Position',
      )
    })
  })

  describe('Rechte', () => {
    const newRight: RightDef = {channels: ['A'], description: 'd', name: 'r4', roles: ['SYSTEM']}

    it('Erfolg: neues Recht wird angehängt', () => {
      const result = upsertRight({index: null, policy: basePolicy(), right: newRight})
      expect(result.rights.map((right) => right.name)).to.deep.equal(['r1', 'r2', 'r3', 'r4'])
    })

    it('Erfolg: bestehendes Recht wird ersetzt, auch mit gleichem Namen', () => {
      const result = upsertRight({index: 1, policy: basePolicy(), right: {...newRight, name: 'r2'}})
      expect(result.rights[1]).to.deep.equal({...newRight, name: 'r2'})
    })

    it('Fehlschlag: lehnt Recht mit vorhandenem Namen ab', () => {
      expect(
        catchError({fn: () => upsertRight({index: 0, policy: basePolicy(), right: {...newRight, name: 'r2'}})}).message,
      ).to.equal('Recht r2 existiert bereits')
      expect(
        catchError({fn: () => upsertRight({index: null, policy: basePolicy(), right: {...newRight, name: 'r1'}})})
          .message,
      ).to.equal('Recht r1 existiert bereits')
    })

    it('Fehlschlag: lehnt Recht mit leerem Namen oder ungültigem Index ab', () => {
      expect(
        catchError({fn: () => upsertRight({index: null, policy: basePolicy(), right: {...newRight, name: ' '}})})
          .message,
      ).to.equal('Name darf nicht leer sein')
      expect(catchError({fn: () => upsertRight({index: 3, policy: basePolicy(), right: newRight})}).message).to.equal(
        'Ungültige Position',
      )
    })

    it('Erfolg: Recht wird gelöscht', () => {
      expect(deleteRight({index: 1, policy: basePolicy()}).rights.map((right) => right.name)).to.deep.equal([
        'r1',
        'r3',
      ])
    })

    it('Fehlschlag: Löschen mit ungültigem Index wird abgelehnt', () => {
      expect(catchError({fn: () => deleteRight({index: 3, policy: basePolicy()})}).message).to.equal(
        'Ungültige Position',
      )
    })

    it('Erfolg: moveRight verschiebt und ändert die Reihenfolge', () => {
      const names = (policy: PolicyFile): string[] => policy.rights.map((right) => right.name)
      expect(names(moveRight({from: 0, policy: basePolicy(), to: 2}))).to.deep.equal(['r2', 'r3', 'r1'])
      expect(names(moveRight({from: 2, policy: basePolicy(), to: 0}))).to.deep.equal(['r3', 'r1', 'r2'])
    })

    it('Fehlschlag: moveRight mit ungültigem Index wird abgelehnt', () => {
      expect(catchError({fn: () => moveRight({from: 0, policy: basePolicy(), to: 3})}).message).to.equal(
        'Ungültige Position',
      )
      expect(catchError({fn: () => moveRight({from: -1, policy: basePolicy(), to: 0})}).message).to.equal(
        'Ungültige Position',
      )
    })
  })

  it('Erfolg: Operationen verändern das Eingabeobjekt nicht', () => {
    const policy = basePolicy()
    const right: RightDef = {channels: ['A'], description: 'd', name: 'r4', roles: ['SYSTEM']}
    addChannel({channel: 'D', policy})
    renameChannel({from: 'A', policy, to: 'Z'})
    renameProvider({from: 'p1', policy, to: 'neu'})
    upsertProvider({index: 0, policy, provider: {className: 'MarkProvider', name: 'q'}})
    upsertRight({index: null, policy, right})
    deleteRight({index: 0, policy})
    moveRight({from: 0, policy, to: 2})
    expect(policy).to.deep.equal(basePolicy())
  })
})
