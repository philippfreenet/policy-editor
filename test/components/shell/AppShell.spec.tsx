import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {AppShell} from '../../../src/ui/shell/AppShell.tsx'

describe('AppShell', () => {
  afterEach(cleanup)

  it('Erfolg: state.error erscheint als Alert und lässt sich schließen', async () => {
    const onClearError = sinon.spy()
    render(
      <AppShell drawer={null} error="Kaputt" onClearError={onClearError} sidebar={<aside />} topBar={<header />}>
        <p>Inhalt</p>
      </AppShell>,
    )
    expect(screen.getByRole('alert').textContent).to.contain('Kaputt')
    await userEvent.click(screen.getByRole('button', {name: 'Meldung schließen'}))
    expect(onClearError.calledOnce).to.equal(true)
  })

  it('Fehlschlag: ohne Fehler gibt es keinen Alert', () => {
    render(
      <AppShell drawer={null} sidebar={<aside />} topBar={<header />}>
        <p>Inhalt</p>
      </AppShell>,
    )
    expect(screen.queryByRole('alert')).to.equal(null)
    expect(screen.getByText('Inhalt')).to.not.equal(null)
  })
})
