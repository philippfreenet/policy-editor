import {cleanup, render, screen, waitFor, within} from '@testing-library/react'
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

  it('Erfolg: Rückgängig nach dem Verschieben lässt den Inspektor auf demselben Recht', async () => {
    await loadFixture()
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('button')[3] as HTMLElement)
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Position ändern…'}))
    const field = screen.getByRole('spinbutton', {name: 'Neue ID'})
    await user.clear(field)
    await user.type(field, '1')
    await user.click(screen.getByRole('button', {name: 'Verschieben'}))
    expect(screen.getByText('ID 1')).to.exist
    await user.click(screen.getByRole('button', {name: /Rückgängig/}))
    expect(screen.getByRole('button', {name: 'Name: SimkarteSperren'})).to.exist
    expect(screen.getByText('ID 4')).to.exist
    await user.click(screen.getByRole('button', {name: /Wiederholen/}))
    expect(screen.getByRole('button', {name: 'Name: SimkarteSperren'})).to.exist
    expect(screen.getByText('ID 1')).to.exist
  })

  it('Erfolg: Wechsel der Ansicht behält geöffneten Eintrag und Suchtext', async () => {
    await loadFixture()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Rechte suchen'), 'Simkarte')
    await user.click(within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('button')[0] as HTMLElement)
    const rightName = screen.getByRole('button', {name: /^Name: /}).getAttribute('aria-label')
    const nav = screen.getByRole('navigation', {name: 'Bereiche'})
    await user.click(within(nav).getByRole('button', {name: /Provider/}))
    await user.type(screen.getByLabelText('Provider suchen'), 'Vertrag')
    await user.click(within(screen.getByRole('list', {name: 'Provider'})).getAllByRole('button')[0] as HTMLElement)
    const providerName = screen.getByRole('button', {name: /^Name: /}).getAttribute('aria-label')
    await user.click(within(nav).getByRole('button', {name: /Rechte/}))
    expect((screen.getByLabelText('Rechte suchen') as HTMLInputElement).value).to.equal('Simkarte')
    expect(screen.getByRole('button', {name: /^Name: /}).getAttribute('aria-label')).to.equal(rightName)
    await user.click(within(nav).getByRole('button', {name: /Provider/}))
    expect((screen.getByLabelText('Provider suchen') as HTMLInputElement).value).to.equal('Vertrag')
    expect(screen.getByRole('button', {name: /^Name: /}).getAttribute('aria-label')).to.equal(providerName)
  })

  it('Erfolg: Änderungszähler zählt Zeilen des Diffs, auch bei Provider-Änderungen', async () => {
    await loadFixture()
    expect(await screen.findByRole('button', {name: 'Änderungen (0)'})).to.not.equal(null)
    await userEvent.click(
      within(screen.getByRole('navigation', {name: 'Bereiche'})).getByRole('button', {name: /^Provider/}),
    )
    await userEvent.click(within(screen.getByRole('list', {name: 'Provider'})).getAllByRole('button')[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', {name: /^Beschreibung:/}))
    const input = screen.getByRole('textbox', {name: 'Beschreibung'})
    await userEvent.clear(input)
    await userEvent.type(input, 'Neue Beschreibung{Enter}')
    await waitFor(() => {
      const label = screen.getByRole('button', {name: /^Änderungen \(\d+\)$/}).textContent ?? ''
      expect(Number(/\d+/.exec(label)?.[0])).to.be.greaterThan(0)
    })
  })

  it('Erfolg: ein gelöschtes Recht erhöht den Änderungszähler', async () => {
    await loadFixture()
    await userEvent.click(within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('button')[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await userEvent.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    await userEvent.click(screen.getAllByRole('button', {name: 'Löschen'}).at(-1) as HTMLElement)
    await waitFor(() => {
      const label = screen.getByRole('button', {name: /^Änderungen \(\d+\)$/}).textContent ?? ''
      expect(Number(/\d+/.exec(label)?.[0])).to.be.greaterThan(0)
    })
  })

  it('Erfolg: die Übersicht wird beim ersten Öffnen nachgeladen', async () => {
    await loadFixture()
    await userEvent.click(
      within(screen.getByRole('navigation', {name: 'Bereiche'})).getByRole('button', {name: /^Übersicht/}),
    )
    expect(await screen.findByRole('heading', {name: /Übersicht/})).to.not.equal(null)
  })

  it('Erfolg: „Wer darf was“ wird nachgeladen und öffnet ein Recht im Inspektor', async () => {
    await loadFixture()
    const nav = screen.getByRole('navigation', {name: 'Bereiche'})
    await userEvent.click(within(nav).getByRole('button', {name: 'Wer darf was'}))
    const list = await screen.findByRole('list', {name: /Abhängig von Bedingung/})
    await userEvent.click(within(list).getByRole('button', {name: /SimkarteSperren/}))
    expect(screen.getByRole('button', {name: 'Name: SimkarteSperren'})).to.exist
  })

  it('Erfolg: der Änderungs-Dialog wird beim Öffnen nachgeladen', async () => {
    await loadFixture()
    await userEvent.click(await screen.findByRole('button', {name: /^Änderungen/}))
    expect(await screen.findByRole('dialog')).to.not.equal(null)
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
