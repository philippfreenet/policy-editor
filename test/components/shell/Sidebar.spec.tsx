import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {Sidebar} from '../../../src/ui/shell/Sidebar.tsx'

/** Rendert die Seitenleiste mit Standardwerten, überschreibbar je Test. */
function setup(args: Partial<Parameters<typeof Sidebar>[0]> = {}): {
  onOpenFindings: sinon.SinonSpy
  onSelect: sinon.SinonSpy
} {
  const onOpenFindings = sinon.spy()
  const onSelect = sinon.spy()
  render(
    <Sidebar
      changedCount={0}
      counts={{channels: 2, providers: 3, rights: 4}}
      errorCount={0}
      onOpenChanges={() => undefined}
      onOpenFindings={onOpenFindings}
      onSelect={onSelect}
      view="rights"
      warningCount={0}
      {...args}
    />,
  )
  return {onOpenFindings, onSelect}
}

describe('Sidebar', () => {
  afterEach(cleanup)

  it('Erfolg: Seitenleiste bleibt am Fenster haften, damit Änderungen und Status sichtbar sind', () => {
    setup()
    const classes = screen.getByRole('navigation', {name: 'Bereiche'}).closest('aside')?.className ?? ''
    expect(classes).to.contain('lg:sticky')
    expect(classes).to.contain('lg:h-screen')
    expect(classes).to.contain('lg:overflow-y-auto')
  })

  it('Erfolg: aktive Ansicht hat aria-current', () => {
    setup()
    const nav = screen.getByRole('navigation', {name: 'Bereiche'})
    expect(nav.querySelector('[aria-current="page"]')?.textContent).to.contain('Rechte')
    expect(nav.querySelectorAll('[aria-current]').length).to.equal(1)
  })

  it('Erfolg: Klick auf einen Bereich ruft onSelect', async () => {
    const {onSelect} = setup()
    await userEvent.click(screen.getByRole('button', {name: /Channels/}))
    expect(onSelect.calledWith('channels')).to.equal(true)
  })

  it('Erfolg: zeigt „✓ Datei gültig“ ohne Befunde', () => {
    setup()
    expect(screen.getByText('✓ Datei gültig')).to.not.equal(null)
  })

  it('Fehlschlag: zeigt „2 Fehler · 1 Warnung“', () => {
    setup({errorCount: 2, warningCount: 1})
    expect(screen.getByText('2 Fehler · 1 Warnung')).to.not.equal(null)
  })

  it('Fehlschlag: zeigt „1 Fehler · 2 Warnungen“', () => {
    setup({errorCount: 1, warningCount: 2})
    expect(screen.getByText('1 Fehler · 2 Warnungen')).to.not.equal(null)
  })

  it('Erfolg: Klick auf Status ruft onOpenFindings', async () => {
    const {onOpenFindings} = setup({errorCount: 1})
    await userEvent.click(screen.getByText('1 Fehler · 0 Warnungen'))
    expect(onOpenFindings.calledOnce).to.equal(true)
  })
})
