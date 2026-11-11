import {cleanup, render, screen} from '@testing-library/react'
import {expect} from 'chai'
import sinon from 'sinon'
import {Toast} from '../../../src/ui/kit/Toast.tsx'

describe('Toast', () => {
  let clock: sinon.SinonFakeTimers

  beforeEach(() => {
    clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
  })

  afterEach(() => {
    cleanup()
    clock.restore()
  })

  it('Erfolg: zeigt die Meldung und ruft nach 3 s onDone', () => {
    const onDone = sinon.spy()
    render(<Toast message="Gespeichert" onDone={onDone} />)
    expect(screen.getByRole('status').textContent).to.equal('Gespeichert')
    clock.tick(2999)
    expect(onDone.called).to.equal(false)
    clock.tick(1)
    expect(onDone.calledOnce).to.equal(true)
  })

  it('Fehlschlag: ohne Meldung kein Timer-Aufruf', () => {
    const onDone = sinon.spy()
    render(<Toast message={null} onDone={onDone} />)
    clock.tick(5000)
    expect(onDone.called).to.equal(false)
  })

  it('Erfolg: dieselbe Meldung mit neuer showId startet den Timer neu', () => {
    const onDone = sinon.spy()
    const {rerender} = render(<Toast message="Gespeichert" onDone={onDone} showId={1} />)
    clock.tick(2000)
    rerender(<Toast message="Gespeichert" onDone={onDone} showId={2} />)
    clock.tick(2000)
    expect(onDone.called).to.equal(false)
    clock.tick(1000)
    expect(onDone.calledOnce).to.equal(true)
  })
})
