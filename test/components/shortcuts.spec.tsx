import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {useState} from 'react'
import sinon from 'sinon'
import {ConfirmDialog} from '../../src/ui/kit/ConfirmDialog.tsx'
import {useShortcuts} from '../../src/ui/useShortcuts.ts'

interface HarnessProps {
  dialog?: boolean
  dispatch: () => void
  onFocusSearch: () => void
  onMoveSelection: (delta: -1 | 1) => void
}

/** Testaufbau: Textfeld, Liste mit Einträgen und optional ein offener Bestätigungsdialog. */
function Harness({dialog = false, dispatch, onFocusSearch, onMoveSelection}: HarnessProps): React.JSX.Element {
  const [text, setText] = useState('')
  useShortcuts({dispatch, enabled: true, onFocusSearch, onMoveSelection})
  return (
    <>
      <input aria-label="Suche" onChange={(e) => setText(e.target.value)} type="search" value={text} />
      <ul id="rights-list">
        <li>
          <button type="button">Eintrag</button>
        </li>
      </ul>
      <ConfirmDialog
        confirmLabel="Ja"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        open={dialog}
        title="Frage"
      >
        <p>Sicher?</p>
      </ConfirmDialog>
    </>
  )
}

describe('useShortcuts', () => {
  afterEach(() => {
    cleanup()
  })

  /** Rendert den Testaufbau mit Spies. */
  function setup(dialog = false): {dispatch: sinon.SinonSpy; focus: sinon.SinonSpy; move: sinon.SinonSpy} {
    const dispatch = sinon.spy()
    const focus = sinon.spy()
    const move = sinon.spy()
    render(<Harness dialog={dialog} dispatch={dispatch} onFocusSearch={focus} onMoveSelection={move} />)
    return {dispatch, focus, move}
  }

  it('Erfolg: „/“ ruft onFocusSearch', async () => {
    const {focus} = setup()
    await userEvent.keyboard('/')
    expect(focus.calledOnce).to.equal(true)
  })

  it('Fehlschlag: „/“ im Textfeld tippt ein Zeichen und ruft nichts', async () => {
    const {focus} = setup()
    await userEvent.type(screen.getByLabelText('Suche'), '/')
    expect(focus.called).to.equal(false)
    expect((screen.getByLabelText('Suche') as HTMLInputElement).value).to.equal('/')
  })

  it('Erfolg: Pfeil runter in der Liste ruft onMoveSelection(1), Pfeil hoch (-1)', async () => {
    const {move} = setup()
    screen.getByRole('button', {name: 'Eintrag'}).focus()
    await userEvent.keyboard('{ArrowDown}{ArrowUp}')
    expect(move.args).to.deep.equal([[1], [-1]])
  })

  it('Fehlschlag: Pfeil runter außerhalb der Liste ruft nichts', async () => {
    const {move} = setup()
    await userEvent.keyboard('{ArrowDown}')
    expect(move.called).to.equal(false)
  })

  it('Erfolg: Strg+Z löst Rückgängig aus', async () => {
    const {dispatch} = setup()
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(dispatch.calledOnce).to.equal(true)
  })

  it('Fehlschlag: bei offenem ConfirmDialog greift kein Kürzel', async () => {
    const {dispatch, focus, move} = setup(true)
    screen.getByRole('button', {name: 'Ja'}).focus()
    await userEvent.keyboard('/{ArrowDown}{Control>}z{/Control}')
    expect(focus.called || move.called || dispatch.called).to.equal(false)
  })
})
