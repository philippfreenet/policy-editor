import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {App} from '../../src/App.tsx'
import {FIXTURE_TEXT} from './loadFixture.ts'

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

  it('Erfolg: „/“ fokussiert die Suche, Pfeil runter wählt den nächsten Eintrag der Liste', async () => {
    render(<App />)
    await userEvent.click(screen.getByLabelText('Oder JSON einfügen'))
    await userEvent.paste(FIXTURE_TEXT)
    await userEvent.click(screen.getByRole('button', {name: 'Laden'}))
    await userEvent.keyboard('/')
    expect(document.activeElement).to.equal(screen.getByLabelText('Rechte suchen'))
    const items = within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('button')
    items[0]?.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).to.equal(items[1])
    expect(items[1]?.getAttribute('aria-current')).to.equal('true')
  })

  /** Lädt die Fixture per Einfügen in den Editor. */
  async function loadFixture(): Promise<void> {
    render(<App />)
    await userEvent.click(screen.getByLabelText('Oder JSON einfügen'))
    await userEvent.paste(FIXTURE_TEXT)
    await userEvent.click(screen.getByRole('button', {name: 'Laden'}))
  }

  it('Erfolg: Änderungszähler zählt Zeilen des Diffs, auch bei Provider-Änderungen', async () => {
    await loadFixture()
    expect(screen.getByRole('button', {name: 'Änderungen (0)'})).to.not.equal(null)
    await userEvent.click(
      within(screen.getByRole('navigation', {name: 'Bereiche'})).getByRole('button', {name: /^Provider/}),
    )
    await userEvent.click(within(screen.getByRole('list', {name: 'Provider'})).getAllByRole('button')[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', {name: /^Beschreibung:/}))
    const input = screen.getByRole('textbox', {name: 'Beschreibung'})
    await userEvent.clear(input)
    await userEvent.type(input, 'Neue Beschreibung{Enter}')
    const label = screen.getByRole('button', {name: /^Änderungen \(\d+\)$/}).textContent ?? ''
    expect(Number(/\d+/.exec(label)?.[0])).to.be.greaterThan(0)
  })

  it('Erfolg: ein gelöschtes Recht erhöht den Änderungszähler', async () => {
    await loadFixture()
    await userEvent.click(within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('button')[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await userEvent.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    await userEvent.click(screen.getAllByRole('button', {name: 'Löschen'}).at(-1) as HTMLElement)
    const label = screen.getByRole('button', {name: /^Änderungen \(\d+\)$/}).textContent ?? ''
    expect(Number(/\d+/.exec(label)?.[0])).to.be.greaterThan(0)
  })

  it('Erfolg: Kopfleiste zeigt „Eingefügter Text“ nach Einfügen und „Neue Konfiguration“ nach Neuanlage', async () => {
    await loadFixture()
    expect(screen.getByText('Eingefügter Text')).to.not.equal(null)
    cleanup()
    window.localStorage.clear()
    await startEmpty()
    expect(screen.getByText('Neue Konfiguration')).to.not.equal(null)
  })

  it('Erfolg: Kopfleiste zeigt den Dateinamen der geladenen Datei, nach Neustart „policy.json“', async () => {
    render(<App />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File([FIXTURE_TEXT], 'meine-policy.json', {type: 'application/json'}))
    expect(await screen.findByText('meine-policy.json')).to.not.equal(null)
    cleanup()
    render(<App />)
    expect(screen.getByText('policy.json', {selector: 'span'})).to.not.equal(null)
  })
})
