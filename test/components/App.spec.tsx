import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {App} from '../../src/App.tsx'

describe('App', () => {
  let createUrl: sinon.SinonStub

  beforeEach(() => {
    window.localStorage.clear()
    createUrl = sinon.stub()
    createUrl.returns('blob:test')
    URL.createObjectURL = createUrl as unknown as typeof URL.createObjectURL
    sinon.stub(HTMLAnchorElement.prototype, 'click')
  })

  afterEach(() => {
    cleanup()
    sinon.restore()
    window.localStorage.clear()
  })

  /** Startet mit einer leeren Konfiguration, die Prüffehler enthält. */
  async function startEmpty(): Promise<void> {
    render(<App />)
    await userEvent.click(screen.getByRole('button', {name: 'Leere Konfiguration anlegen'}))
  }

  it('Fehlschlag: Download mit Prüffehlern wartet auf Bestätigung', async () => {
    await startEmpty()
    await userEvent.click(screen.getByRole('button', {name: 'Herunterladen'}))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).to.contain('Trotzdem herunterladen?')
    expect(createUrl.called).to.equal(false)
    await userEvent.click(screen.getAllByRole('button', {name: 'Herunterladen'}).at(-1) as HTMLElement)
    expect(createUrl.calledOnce).to.equal(true)
    expect(screen.getByRole('status').textContent).to.equal('policy.json heruntergeladen')
  })

  it('Fehlschlag: Abbrechen im Download-Dialog lädt nichts herunter', async () => {
    await startEmpty()
    await userEvent.click(screen.getByRole('button', {name: 'Herunterladen'}))
    await userEvent.click(screen.getByRole('button', {name: 'Abbrechen'}))
    expect(createUrl.called).to.equal(false)
  })

  it('Fehlschlag: Laden mit ungespeicherten Änderungen fragt vorher, Abbrechen behält den Stand', async () => {
    await startEmpty()
    await userEvent.click(screen.getByRole('button', {name: 'Neu laden'}))
    await userEvent.click(screen.getByLabelText('Oder JSON einfügen'))
    await userEvent.paste('{"channels":["A"],"providers":[],"rights":[]}')
    await userEvent.click(screen.getByRole('button', {name: 'Laden'}))
    expect(screen.getByRole('dialog').textContent).to.contain('Ungespeicherte Änderungen')
    await userEvent.click(screen.getByRole('button', {name: 'Abbrechen'}))
    expect(screen.getByLabelText('Oder JSON einfügen')).to.not.equal(null)
    expect(screen.getByRole('button', {name: 'Letzten Stand fortsetzen'})).to.not.equal(null)
  })

  it('Erfolg: Bestätigen des Verwerfens lädt die neue Datei', async () => {
    await startEmpty()
    await userEvent.click(screen.getByRole('button', {name: 'Neu laden'}))
    await userEvent.click(screen.getByLabelText('Oder JSON einfügen'))
    await userEvent.paste('{"channels":["A"],"providers":[],"rights":[]}')
    await userEvent.click(screen.getByRole('button', {name: 'Laden'}))
    await userEvent.click(screen.getByRole('button', {name: 'Verwerfen'}))
    expect(screen.queryByLabelText('Oder JSON einfügen')).to.equal(null)
    expect(screen.getByRole('navigation', {name: 'Bereiche'})).to.not.equal(null)
  })
})
