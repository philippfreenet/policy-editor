import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {FindingsDrawer} from '../../../src/ui/shell/FindingsDrawer.tsx'

describe('FindingsDrawer', () => {
  afterEach(cleanup)

  it('Erfolg: Klick auf Befund ruft onSelect mit Pfad', async () => {
    const onSelect = sinon.spy()
    render(
      <FindingsDrawer
        findings={[{message: 'Name fehlt', path: 'rights[1].name', severity: 'error'}]}
        loadNotes={[]}
        onClose={() => undefined}
        onSelect={onSelect}
        open
        showUnknownFieldHint={false}
      />,
    )
    await userEvent.click(screen.getByRole('button', {name: /Name fehlt/}))
    expect(onSelect.calledWith('rights[1].name')).to.equal(true)
  })

  it('Fehlschlag: ohne Befunde steht „Keine Befunde.“ da', () => {
    render(
      <FindingsDrawer
        findings={[]}
        loadNotes={[]}
        onClose={() => undefined}
        onSelect={() => undefined}
        open
        showUnknownFieldHint
      />,
    )
    expect(screen.getByText('Keine Befunde.')).to.not.equal(null)
    expect(screen.getByText('Unbekannte Felder werden beim Herunterladen verworfen.')).to.not.equal(null)
  })
})
