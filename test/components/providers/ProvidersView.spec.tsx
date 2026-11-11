import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {useReducer, useState} from 'react'
import sinon from 'sinon'
import {findProviderUsages} from '../../../src/model/operations.ts'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {loadFixturePolicy} from '../loadFixture.ts'
import {editorReducer, initialState} from '../../../src/state/editorReducer.ts'
import {ProvidersView} from '../../../src/ui/providers/ProvidersView.tsx'

/** Liest die Produktiv-Policy (über den echten Parser) und wendet eine Anpassung an; liefert den Text für den Reducer. */
function fixtureText(args?: {tweak?: (policy: PolicyFile) => void}): string {
  const policy = loadFixturePolicy()
  args?.tweak?.(policy)
  return JSON.stringify(policy)
}

interface HarnessProps {
  index: number | null
  latest: {policy: PolicyFile | null}
  onOpenRight: (index: number) => void
  text: string
}

/** Rahmen mit echtem Reducer, damit Dispatches wirken; legt die letzte Policy in `latest` ab. */
function Harness(props: HarnessProps): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, props.text, (text) =>
    editorReducer(initialState, {text, type: 'load'}),
  )
  const [selection, setSelection] = useState<{field: string | null; index: number | null} | null>(
    props.index === null ? null : {field: null, index: props.index},
  )
  props.latest.policy = state.policy
  if (state.policy === null) {
    return <p>leer</p>
  }
  return (
    <>
      <button onClick={() => setSelection({field: 'description', index: 4})} type="button">
        Springe zur Beschreibung
      </button>
      <ProvidersView
        dispatch={dispatch}
        findings={state.findings}
        onOpenRight={props.onOpenRight}
        policy={state.policy}
        selection={selection}
      />
    </>
  )
}

/** Rendert die Ansicht und liefert Zugriff auf die aktuelle Policy. */
function setup(args?: {index?: number | null; onOpenRight?: (index: number) => void; text?: string}): {
  latest: {policy: PolicyFile | null}
} {
  const latest: {policy: PolicyFile | null} = {policy: null}
  render(
    <Harness
      index={args?.index === undefined ? 4 : args.index}
      latest={latest}
      onOpenRight={args?.onOpenRight ?? (() => undefined)}
      text={args?.text ?? fixtureText()}
    />,
  )
  return {latest}
}

/** Index des ersten Providers mit (oder ohne) Verwendung in Rechten. */
function providerIndex(args: {used: boolean}): number {
  const policy = loadFixturePolicy()
  return policy.providers.findIndex((p) => findProviderUsages({name: p.name, policy}).length > 0 === args.used)
}

describe('ProvidersView', () => {
  afterEach(() => {
    cleanup()
    sinon.restore()
  })

  it('Erfolg: Satz „Trifft nicht zu, wenn …“ bei Negation', async () => {
    const user = userEvent.setup()
    setup({index: 4})
    expect(screen.getByText(/^Trifft zu, wenn ContractStates ∈/)).to.exist
    await user.click(screen.getByRole('switch', {name: 'Negation'}))
    expect(screen.getByRole('switch', {name: 'Negation'}).getAttribute('aria-checked')).to.equal('true')
    expect(screen.getByText(/^Trifft nicht zu, wenn ContractStates ∈/)).to.exist
  })

  it('Erfolg: Umbenennen zieht Referenzen in Bedingungen nach', async () => {
    const user = userEvent.setup()
    const index = providerIndex({used: true})
    const {latest} = setup({index})
    const old = latest.policy?.providers[index]?.name ?? ''
    await user.click(screen.getByRole('button', {name: `Name: ${old}`}))
    const input = screen.getByRole('textbox', {name: 'Name'})
    await user.clear(input)
    await user.type(input, 'Umbenannt{Enter}')
    const policy = latest.policy as PolicyFile
    expect(policy.providers[index]?.name).to.equal('Umbenannt')
    expect(findProviderUsages({name: 'Umbenannt', policy}).length).to.be.greaterThan(0)
    expect(findProviderUsages({name: old, policy})).to.have.length(0)
  })

  it('Fehlschlag: doppelter Provider-Name zeigt Fehler am Feld und ändert nichts', async () => {
    const user = userEvent.setup()
    const {latest} = setup({index: 4})
    const other = latest.policy?.providers[0]?.name ?? ''
    await user.click(screen.getByRole('button', {name: /^Name:/}))
    const input = screen.getByRole('textbox', {name: 'Name'})
    await user.clear(input)
    await user.type(input, `${other}{Enter}`)
    expect(screen.getByRole('alert').textContent).to.contain('existiert bereits')
    expect(latest.policy?.providers[4]?.name).to.not.equal(other)
  })

  it('Fehlschlag: Löschen ist bei Verwendung deaktiviert und nennt die Zahl', async () => {
    const user = userEvent.setup()
    const index = providerIndex({used: true})
    const {latest} = setup({index})
    const policy = latest.policy as PolicyFile
    const count = findProviderUsages({name: policy.providers[index]?.name ?? '', policy}).length
    expect(screen.getByText(new RegExp(`Wird noch von ${count} ${count === 1 ? 'Recht' : 'Rechte'} verwendet`))).to
      .exist
    await user.click(screen.getByRole('button', {name: 'Aktionen für Provider'}))
    const item = screen.getByRole('menuitem', {name: 'Löschen…'})
    expect(item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true').to.equal(true)
  })

  it('Erfolg: Löschen eines unbenutzten Providers nach Bestätigung; Inspektor zeigt Leerzustand', async () => {
    const user = userEvent.setup()
    const index = providerIndex({used: false})
    const {latest} = setup({index})
    const before = latest.policy?.providers.length ?? 0
    await user.click(screen.getByRole('button', {name: 'Aktionen für Provider'}))
    await user.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    await user.click(screen.getByRole('button', {name: 'Löschen'}))
    expect(latest.policy?.providers).to.have.length(before - 1)
    expect(screen.getByText('Provider aus der Liste wählen oder einen neuen anlegen.')).to.exist
    expect(document.activeElement?.id).to.equal('providers-list')
  })

  it('Erfolg: Klick auf nutzendes Recht ruft onOpenRight(index)', async () => {
    const user = userEvent.setup()
    const onOpenRight = sinon.spy()
    const index = providerIndex({used: true})
    const {latest} = setup({index, onOpenRight})
    const policy = latest.policy as PolicyFile
    const first = findProviderUsages({name: policy.providers[index]?.name ?? '', policy})[0] as number
    const list = screen.getByRole('list', {name: 'Verwendet von'})
    await user.click(within(list).getAllByRole('button')[0] as HTMLElement)
    expect(onOpenRight.calledOnceWithExactly(first)).to.equal(true)
  })

  it('Erfolg: „+ Neuer Provider“ legt NeuerProvider mit erster Klasse und negation false an', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    const before = latest.policy?.providers.length ?? 0
    await user.click(screen.getByRole('button', {name: '+ Neuer Provider'}))
    const created = latest.policy?.providers.at(-1)
    expect(latest.policy?.providers).to.have.length(before + 1)
    expect(created?.name).to.equal('NeuerProvider')
    expect(created?.negation).to.equal(false)
    expect(screen.getByRole('button', {name: 'Name: NeuerProvider'})).to.exist
  })

  it('Erfolg: Suche filtert nach Name und Beschreibung', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByRole('searchbox', {name: 'Provider suchen'}), 'Kein_Mitarbeiter')
    expect(screen.getByText('1 von 48')).to.exist
    await user.clear(screen.getByRole('searchbox', {name: 'Provider suchen'}))
    await user.type(screen.getByRole('searchbox', {name: 'Provider suchen'}), 'xyz-gibt-es-nicht')
    expect(screen.getByText('Keine Treffer.')).to.exist
  })

  it('Erfolg: leere Beschreibung lässt den Schlüssel weg', async () => {
    const user = userEvent.setup()
    const {latest} = setup({index: 4})
    await user.click(screen.getByRole('button', {name: /^Beschreibung:/}))
    await user.clear(screen.getByRole('textbox', {name: 'Beschreibung'}))
    await user.keyboard('{Enter}')
    expect(latest.policy?.providers[4]).to.not.have.property('description')
  })

  it('Erfolg: Sprung auf ein Feld fokussiert es auch bei wiederholtem Sprung', async () => {
    const user = userEvent.setup()
    setup({index: null})
    await user.click(screen.getByRole('button', {name: 'Springe zur Beschreibung'}))
    expect(document.activeElement?.getAttribute('aria-label')).to.match(/^Beschreibung:/)
    ;(document.activeElement as HTMLElement).blur()
    await user.click(screen.getByRole('button', {name: 'Springe zur Beschreibung'}))
    expect(document.activeElement?.getAttribute('aria-label')).to.match(/^Beschreibung:/)
  })

  it('Erfolg: unbekannte Klasse bleibt auswählbar und wird als „(unbekannt)“ gezeigt', () => {
    setup({
      index: 4,
      text: fixtureText({
        tweak: (p) => {
          const provider = p.providers[4]
          if (provider !== undefined) {
            provider.className = 'GibtEsNicht'
          }
        },
      }),
    })
    expect((screen.getByRole('combobox', {name: 'Klasse'}) as HTMLSelectElement).value).to.equal('GibtEsNicht')
    expect(screen.getByRole('option', {name: 'GibtEsNicht (unbekannt)'})).to.exist
  })
})
