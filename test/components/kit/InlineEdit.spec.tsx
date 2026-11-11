import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {InlineEdit} from '../../../src/ui/kit/InlineEdit.tsx'

describe('InlineEdit', () => {
  afterEach(() => {
    cleanup()
  })

  /** Rendert das Feld mit Standardwerten. */
  function setup(args: {error?: string | null} = {}): sinon.SinonSpy {
    const onCommit = sinon.spy()
    render(<InlineEdit ariaLabel="Name" error={args.error} onCommit={onCommit} value="alt" />)
    return onCommit
  }

  it('Erfolg: Enter übernimmt', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    await user.click(screen.getByRole('button', {name: 'Name'}))
    await user.clear(screen.getByRole('textbox', {name: 'Name'}))
    await user.type(screen.getByRole('textbox', {name: 'Name'}), 'neu{Enter}')
    expect(onCommit.calledOnceWith('neu')).to.equal(true)
    expect(screen.queryByRole('textbox')).to.equal(null)
  })

  it('Erfolg: Blur übernimmt', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    await user.click(screen.getByRole('button', {name: 'Name'}))
    await user.type(screen.getByRole('textbox', {name: 'Name'}), 'x')
    await user.tab()
    expect(onCommit.calledOnceWith('altx')).to.equal(true)
  })

  it('Fehlschlag: Escape verwirft und ruft onCommit nicht', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    await user.click(screen.getByRole('button', {name: 'Name'}))
    await user.type(screen.getByRole('textbox', {name: 'Name'}), 'x{Escape}')
    expect(onCommit.called).to.equal(false)
    expect(screen.getByRole('button', {name: 'Name'}).textContent).to.equal('alt')
  })

  it('Fehlschlag: unveränderter Wert ruft onCommit nicht', async () => {
    const user = userEvent.setup()
    const onCommit = setup()
    await user.click(screen.getByRole('button', {name: 'Name'}))
    await user.keyboard('{Enter}')
    expect(onCommit.called).to.equal(false)
    expect(screen.queryByRole('textbox')).to.equal(null)
  })

  it('Fehlschlag: error bleibt sichtbar und Feld bleibt offen', async () => {
    const user = userEvent.setup()
    const onCommit = sinon.spy()
    const {rerender} = render(<InlineEdit ariaLabel="Name" onCommit={onCommit} value="alt" />)
    await user.click(screen.getByRole('button', {name: 'Name'}))
    await user.type(screen.getByRole('textbox', {name: 'Name'}), 'x{Enter}')
    rerender(<InlineEdit ariaLabel="Name" error="Name vergeben" onCommit={onCommit} value="alt" />)
    const input = screen.getByRole('textbox', {name: 'Name'})
    expect(screen.getByText('Name vergeben')).to.exist
    expect(input.getAttribute('aria-describedby')).to.equal(screen.getByText('Name vergeben').id)
  })
})
