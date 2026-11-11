import {cleanup, render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {useReducer} from 'react'
import sinon from 'sinon'
import {findChannelUsages} from '../../../src/model/operations.ts'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {FIXTURE_TEXT, loadFixturePolicy} from '../loadFixture.ts'
import {editorReducer, initialState} from '../../../src/state/editorReducer.ts'
import {ChannelsView} from '../../../src/ui/channels/ChannelsView.tsx'

/** Rahmen mit echtem Reducer, damit Dispatches wirken; legt die letzte Policy in `latest` ab. */
function Harness(props: {
  latest: {policy: PolicyFile | null}
  onOpenRight: (index: number) => void
  text: string
}): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, props.text, (text) =>
    editorReducer(initialState, {text, type: 'load'}),
  )
  props.latest.policy = state.policy
  if (state.policy === null) {
    return <p>leer</p>
  }
  return (
    <ChannelsView
      dispatch={dispatch}
      findings={state.findings}
      onOpenRight={props.onOpenRight}
      policy={state.policy}
      selection={null}
    />
  )
}

/** Rendert die Ansicht und liefert Zugriff auf die aktuelle Policy. */
function setup(args?: {onOpenRight?: (index: number) => void; text?: string}): {latest: {policy: PolicyFile | null}} {
  const latest: {policy: PolicyFile | null} = {policy: null}
  render(
    <Harness latest={latest} onOpenRight={args?.onOpenRight ?? (() => undefined)} text={args?.text ?? FIXTURE_TEXT} />,
  )
  return {latest}
}

describe('ChannelsView', () => {
  afterEach(() => {
    cleanup()
    sinon.restore()
  })

  it('Erfolg: Channel hinzufügen hängt ihn an und leert das Feld', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.type(screen.getByRole('textbox', {name: 'Channel hinzufügen'}), 'NEUER_CHANNEL')
    await user.click(screen.getByRole('button', {name: 'Hinzufügen'}))
    expect(latest.policy?.channels.at(-1)).to.equal('NEUER_CHANNEL')
    expect((screen.getByRole('textbox', {name: 'Channel hinzufügen'}) as HTMLInputElement).value).to.equal('')
  })

  it('Erfolg: Umbenennen zieht Referenzen in den Rechten nach', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    const before = findChannelUsages({channel: 'APP', policy: latest.policy as PolicyFile})
    await user.click(screen.getByRole('button', {name: 'Channel APP: APP'}))
    const input = screen.getByRole('textbox', {name: 'Channel APP'})
    await user.clear(input)
    await user.type(input, 'APP2{Enter}')
    const policy = latest.policy as PolicyFile
    expect(policy.channels).to.include('APP2')
    expect(findChannelUsages({channel: 'APP2', policy})).to.deep.equal(before)
    expect(findChannelUsages({channel: 'APP', policy})).to.have.length(0)
  })

  it('Fehlschlag: doppelter Channel-Name zeigt Fehler am Feld', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    const before = latest.policy?.channels.join(',')
    await user.type(screen.getByRole('textbox', {name: 'Channel hinzufügen'}), 'APP')
    await user.click(screen.getByRole('button', {name: 'Hinzufügen'}))
    expect(screen.getByRole('alert').textContent).to.contain('existiert bereits')
    expect(latest.policy?.channels.join(',')).to.equal(before)
    await user.click(screen.getByRole('button', {name: 'Channel APP: APP'}))
    const input = screen.getByRole('textbox', {name: 'Channel APP'})
    await user.clear(input)
    await user.type(input, `KM_APP{Enter}`)
    expect(within(input.closest('li') as HTMLElement).getByRole('alert').textContent).to.contain('existiert bereits')
    expect(latest.policy?.channels.join(',')).to.equal(before)
  })

  it('Fehlschlag: Löschen gesperrt solange genutzt', () => {
    const {latest} = setup()
    const count = findChannelUsages({channel: 'APP', policy: latest.policy as PolicyFile}).length
    const button = screen.getByRole('button', {name: 'Channel APP löschen'}) as HTMLButtonElement
    expect(button.disabled).to.equal(true)
    expect(button.title).to.equal(`Gesperrt: noch in ${count} Rechten verwendet`)
    expect(screen.getAllByText(`Gesperrt: noch in ${count} Rechten verwendet`).length).to.be.greaterThan(0)
  })

  it('Erfolg: ungenutzter Channel lässt sich löschen; Fokus geht in die Liste', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.type(screen.getByRole('textbox', {name: 'Channel hinzufügen'}), 'LEER')
    await user.click(screen.getByRole('button', {name: 'Hinzufügen'}))
    await user.click(screen.getByRole('button', {name: 'Channel LEER löschen'}))
    expect(latest.policy?.channels).to.include('LEER')
    expect(screen.getByText('Channel LEER löschen?')).to.exist
    await user.click(screen.getByRole('button', {name: 'Löschen'}))
    expect(latest.policy?.channels).to.not.include('LEER')
    await waitFor(() => expect(document.activeElement?.id).to.equal('channels-list'))
  })

  it('Erfolg: Klick auf den Zähler klappt die Rechte auf; Klick auf ein Recht ruft onOpenRight', async () => {
    const user = userEvent.setup()
    const onOpenRight = sinon.spy()
    const {latest} = setup({onOpenRight})
    const first = findChannelUsages({channel: 'APP', policy: latest.policy as PolicyFile})[0] as number
    const row = screen.getByRole('button', {name: 'Channel APP: APP'}).closest('li') as HTMLElement
    const counter = within(row).getByRole('button', {name: /Rechte$/})
    expect(counter.getAttribute('aria-expanded')).to.equal('false')
    await user.click(counter)
    expect(counter.getAttribute('aria-expanded')).to.equal('true')
    await user.click(
      within(within(row).getByRole('list', {name: 'Rechte in APP'})).getAllByRole('button')[0] as HTMLElement,
    )
    expect(onOpenRight.calledOnceWithExactly(first)).to.equal(true)
  })

  it('Erfolg: ohne Channels erscheint „Noch keine Channels.“', () => {
    const policy = loadFixturePolicy()
    policy.channels = []
    policy.rights = []
    setup({text: JSON.stringify(policy)})
    expect(screen.getByText('Noch keine Channels.')).to.exist
  })
})
