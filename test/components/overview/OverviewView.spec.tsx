import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {loadFixturePolicy} from '../loadFixture.ts'
import {rightsFor} from '../../../src/model/rightQueries.ts'
import {OverviewView} from '../../../src/ui/overview/OverviewView.tsx'

const POLICY = loadFixturePolicy()

describe('OverviewView', () => {
  afterEach(() => {
    cleanup()
    sinon.restore()
  })

  it('Erfolg: Zelle zeigt die Anzahl, Auswahl listet die Rechte und „Öffnen“ ruft onOpenRight', async () => {
    const user = userEvent.setup()
    const onOpenRight = sinon.spy()
    render(<OverviewView onOpenRight={onOpenRight} policy={POLICY} />)
    const role = 'PRODUCT_OWNER'
    const channel = POLICY.channels[0] ?? ''
    const indices = rightsFor({channel, policy: POLICY, role})
    const cell = screen.getByRole('button', {name: `${role} in ${channel}: ${indices.length} Rechte`})
    expect(cell.getAttribute('aria-pressed')).to.equal('false')
    await user.click(cell)
    expect(cell.getAttribute('aria-pressed')).to.equal('true')
    await user.click(screen.getAllByRole('button', {name: 'Öffnen'})[0] as HTMLElement)
    expect(onOpenRight.calledOnceWithExactly(indices[0])).to.equal(true)
  })

  it('Erfolg: ohne Channels erscheint der Leerhinweis', () => {
    render(<OverviewView onOpenRight={() => undefined} policy={{...POLICY, channels: []}} />)
    expect(screen.getByText('Noch keine Channels angelegt.')).to.exist
  })
})
