import {cleanup, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {StartScreen} from '../../../src/ui/shell/StartScreen.tsx'

/** Rendert den Startbildschirm mit Standardwerten, überschreibbar je Test. */
function setup(args: Partial<Parameters<typeof StartScreen>[0]> = {}): void {
  render(
    <StartScreen
      error={null}
      hasAutosave={false}
      onCancel={null}
      onClearError={() => undefined}
      onLoad={() => undefined}
      onNew={() => undefined}
      onResume={null}
      {...args}
    />,
  )
}

describe('StartScreen', () => {
  afterEach(cleanup)

  it('Erfolg: „Letzten Stand fortsetzen“ nur mit onResume', async () => {
    setup()
    expect(screen.queryByRole('button', {name: 'Letzten Stand fortsetzen'})).to.equal(null)
    cleanup()
    const onResume = sinon.spy()
    setup({onResume})
    await userEvent.click(screen.getByRole('button', {name: 'Letzten Stand fortsetzen'}))
    expect(onResume.calledOnce).to.equal(true)
  })

  it('Fehlschlag: error wird angezeigt', () => {
    setup({error: 'Ungültiges JSON'})
    expect(screen.getByRole('alert').textContent).to.contain('Ungültiges JSON')
  })

  it('Erfolg: eingefügter Text wird mit „Laden“ geladen', async () => {
    const onLoad = sinon.spy()
    setup({onLoad})
    await userEvent.click(screen.getByLabelText('Oder JSON einfügen'))
    await userEvent.paste('{}')
    await userEvent.click(screen.getByRole('button', {name: 'Laden'}))
    expect(onLoad.calledWith('{}')).to.equal(true)
  })

  it('Erfolg: eine gewählte Datei meldet Text und Dateinamen', async () => {
    const onLoad = sinon.spy()
    const {container} = render(
      <StartScreen
        error={null}
        hasAutosave={false}
        onCancel={null}
        onClearError={() => undefined}
        onLoad={onLoad}
        onNew={() => undefined}
        onResume={null}
      />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['{}'], 'meine.json', {type: 'application/json'}))
    await waitFor(() => expect(onLoad.calledWith('{}', 'meine.json')).to.equal(true))
  })
})
