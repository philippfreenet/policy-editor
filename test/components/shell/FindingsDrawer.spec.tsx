import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {FindingsDrawer} from '../../../src/ui/shell/FindingsDrawer.tsx'

const POLICY: PolicyFile = {
  channels: [],
  providers: [],
  rights: [
    {channels: [], name: 'Eins', description: '', roles: []},
    {channels: [], name: 'Zwei', description: '', roles: []},
  ],
}

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
        policy={POLICY}
        showUnknownFieldHint={false}
      />,
    )
    await userEvent.click(screen.getByRole('button', {name: /Name fehlt/}))
    expect(onSelect.calledWith('rights[1].name')).to.equal(true)
    expect(screen.getByText('Recht #2 Zwei · Name')).to.not.equal(null)
    expect(screen.getByText('rights[1].name').className).to.contain('font-mono')
  })

  it('Fehlschlag: ohne Befunde steht „Keine Befunde.“ da', () => {
    render(
      <FindingsDrawer
        findings={[]}
        loadNotes={[]}
        onClose={() => undefined}
        onSelect={() => undefined}
        open
        policy={POLICY}
        showUnknownFieldHint
      />,
    )
    expect(screen.getByText('Keine Befunde.')).to.not.equal(null)
    expect(screen.getByText('Unbekannte Felder werden beim Herunterladen verworfen.')).to.not.equal(null)
  })
})
