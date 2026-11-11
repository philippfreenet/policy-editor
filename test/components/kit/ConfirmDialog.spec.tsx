import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {useState} from 'react'
import sinon from 'sinon'
import {ConfirmDialog} from '../../../src/ui/kit/ConfirmDialog.tsx'

/** Testaufbau: Auslöser-Button öffnet den Dialog. */
function Harness(args: {onConfirm?: () => void; onCancel?: () => void}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Auslöser
      </button>
      <ConfirmDialog
        confirmLabel="Löschen"
        onCancel={() => {
          args.onCancel?.()
          setOpen(false)
        }}
        onConfirm={() => {
          args.onConfirm?.()
          setOpen(false)
        }}
        open={open}
        title="Recht löschen?"
      >
        <p>Wirklich?</p>
      </ConfirmDialog>
    </>
  )
}

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: Bestätigen ruft onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = sinon.spy()
    render(<Harness onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', {name: 'Auslöser'}))
    await user.click(screen.getByRole('button', {name: 'Löschen'}))
    expect(onConfirm.calledOnce).to.equal(true)
  })

  it('Erfolg: Hintergrund nutzt das Scrim-Token und das Panel hat einen Rahmen', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', {name: 'Auslöser'}))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('.bg-scrim')).to.not.equal(null)
    expect(dialog.querySelector('.border-line-strong')).to.not.equal(null)
  })

  it('Fehlschlag: Escape ruft onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = sinon.spy()
    render(<Harness onCancel={onCancel} />)
    await user.click(screen.getByRole('button', {name: 'Auslöser'}))
    await user.keyboard('{Escape}')
    expect(onCancel.calledOnce).to.equal(true)
  })

  it('Erfolg: Fokus liegt beim Öffnen auf „Abbrechen“', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', {name: 'Auslöser'}))
    expect(document.activeElement).to.equal(screen.getByRole('button', {name: 'Abbrechen'}))
  })

  it('Erfolg: nach Schließen liegt der Fokus wieder auf dem Auslöser', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', {name: 'Auslöser'})
    await user.click(trigger)
    await user.click(screen.getByRole('button', {name: 'Abbrechen'}))
    expect(document.activeElement).to.equal(trigger)
  })

  it('Fehlschlag: confirmDisabled sperrt den Bestätigen-Knopf', () => {
    const onConfirm = sinon.spy()
    render(
      <ConfirmDialog confirmDisabled confirmLabel="Los" onCancel={() => {}} onConfirm={onConfirm} open title="T">
        x
      </ConfirmDialog>,
    )
    expect((screen.getByRole('button', {name: 'Los'}) as HTMLButtonElement).disabled).to.equal(true)
  })
})
