import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {ActionMenu} from '../../../src/ui/kit/ActionMenu.tsx'

describe('ActionMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: Eintrag per Tastatur (Enter, Pfeil, Enter) auswählen', async () => {
    const user = userEvent.setup()
    const dup = sinon.spy()
    const del = sinon.spy()
    render(
      <ActionMenu
        items={[
          {label: 'Duplizieren', onSelect: dup},
          {danger: true, label: 'Löschen', onSelect: del},
        ]}
        label="Aktionen"
      />,
    )
    screen.getByRole('button', {name: 'Aktionen'}).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(dup.called).to.equal(false)
    expect(del.calledOnce).to.equal(true)
  })

  it('Fehlschlag: deaktivierter Eintrag ruft nichts', async () => {
    const user = userEvent.setup()
    const onSelect = sinon.spy()
    render(<ActionMenu items={[{disabled: true, label: 'Löschen', onSelect}]} label="Aktionen" />)
    await user.click(screen.getByRole('button', {name: 'Aktionen'}))
    await user.click(screen.getByRole('menuitem', {name: 'Löschen'}))
    expect(onSelect.called).to.equal(false)
  })
})
