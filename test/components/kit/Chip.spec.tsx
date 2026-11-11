import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {Chip} from '../../../src/ui/kit/Chip.tsx'

describe('Chip', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: Entfernen-Knopf ruft onRemove', async () => {
    const user = userEvent.setup()
    const onRemove = sinon.spy()
    render(
      <Chip onRemove={onRemove} removeLabel="admin entfernen" tone="who">
        admin
      </Chip>,
    )
    await user.click(screen.getByRole('button', {name: 'admin entfernen'}))
    expect(onRemove.calledOnce).to.equal(true)
  })

  it('Fehlschlag: ohne onRemove gibt es keinen Knopf', () => {
    render(<Chip tone="neutral">x</Chip>)
    expect(screen.queryByRole('button')).to.equal(null)
  })
})
