import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {InlineEdit} from '../../../src/ui/kit/InlineEdit.tsx'

describe('InlineEdit', () => {
  afterEach(() => {
    cleanup()
  })

  /** Rendert das Feld; `onCommit` liefert die Ablehnungen der Reihe nach, danach `null`. */
  function setup(args: {rejections?: (string | null)[]} = {}): sinon.SinonStub {
    const onCommit = sinon.stub().returns(null)
    ;(args.rejections ?? []).forEach((r, i) => onCommit.onCall(i).returns(r))
    render(<InlineEdit ariaLabel="Name" onCommit={onCommit} value="alt" />)
    return onCommit
  }

  /** Öffnet das Feld. */
  async function open(user: ReturnType<typeof userEvent.setup>): Promise<HTMLInputElement> {
    await user.click(screen.getByRole('button', {name: 'Name: alt'}))
    return screen.getByRole('textbox', {name: 'Name'})
  }

  it('Erfolg: Anzeige nennt Bezeichnung und aktuellen Wert', () => {
    setup()
    expect(screen.getByRole('button', {name: 'Name: alt'}).textContent).to.equal('alt')
  })

  it('Erfolg: Enter übernimmt', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    const input = await open(user)
    await user.clear(input)
    await user.type(input, 'neu{Enter}')
    expect(onCommit.calledOnceWith('neu')).to.equal(true)
    expect(screen.queryByRole('textbox')).to.equal(null)
  })

  it('Erfolg: Blur übernimmt', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    const input = await open(user)
    await user.type(input, 'x')
    await user.tab()
    expect(onCommit.calledOnceWith('altx')).to.equal(true)
  })

  it('Fehlschlag: Escape verwirft und ruft onCommit nicht', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    const input = await open(user)
    await user.type(input, 'x{Escape}')
    expect(onCommit.called).to.equal(false)
    expect(screen.getByRole('button', {name: 'Name: alt'})).to.exist
  })

  it('Fehlschlag: unveränderter Wert ruft onCommit nicht', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    await open(user)
    await user.keyboard('{Enter}')
    expect(onCommit.called).to.equal(false)
    expect(screen.queryByRole('textbox')).to.equal(null)
  })

  it('Fehlschlag: Ablehnung hält Feld, Entwurf und Fokus und zeigt die Meldung', async () => {
    const user = userEvent.setup()
    setup({rejections: ['Name vergeben']})
    const input = await open(user)
    await user.type(input, 'x{Enter}')
    const field = screen.getByRole('textbox', {name: 'Name'}) as HTMLInputElement
    expect(field.value).to.equal('altx')
    expect(document.activeElement).to.equal(field)
    expect(field.getAttribute('aria-invalid')).to.equal('true')
    expect(field.getAttribute('aria-describedby')).to.equal(screen.getByText('Name vergeben').id)
  })

  it('Fehlschlag: zwei gleiche Ablehnungen nacheinander lassen das Feld offen', async () => {
    const user = userEvent.setup()
    const onCommit = setup({rejections: ['Name vergeben', 'Name vergeben']})
    const input = await open(user)
    await user.type(input, 'x{Enter}')
    await user.keyboard('{Enter}')
    expect(onCommit.calledTwice).to.equal(true)
    expect(screen.getByRole('textbox', {name: 'Name'})).to.exist
    expect(screen.getByText('Name vergeben')).to.exist
  })

  it('Erfolg: korrigierter Wert nach Ablehnung wird übernommen, Meldung verschwindet', async () => {
    const user = userEvent.setup()
    const onCommit = setup({rejections: ['Name vergeben']})
    const input = await open(user)
    await user.type(input, 'x{Enter}')
    await user.clear(screen.getByRole('textbox', {name: 'Name'}))
    await user.type(screen.getByRole('textbox', {name: 'Name'}), 'frei{Enter}')
    expect(onCommit.secondCall.args[0]).to.equal('frei')
    expect(screen.queryByRole('textbox')).to.equal(null)
    expect(screen.queryByText('Name vergeben')).to.equal(null)
  })

  it('Fehlschlag: Blur nach Ablehnung lässt das Feld mit Meldung offen', async () => {
    const user = userEvent.setup()
    setup({rejections: ['Name vergeben']})
    const input = await open(user)
    await user.type(input, 'x')
    await user.tab()
    expect(screen.getByRole('textbox', {name: 'Name'})).to.exist
    expect(screen.getByText('Name vergeben')).to.exist
  })

  it('Fehlschlag: Escape nach Ablehnung verwirft, schließt und löscht die Meldung', async () => {
    const user = userEvent.setup()
    setup({rejections: ['Name vergeben']})
    const input = await open(user)
    await user.type(input, 'x{Enter}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox')).to.equal(null)
    expect(screen.queryByText('Name vergeben')).to.equal(null)
    expect(screen.getByRole('button', {name: 'Name: alt'})).to.exist
  })
})
