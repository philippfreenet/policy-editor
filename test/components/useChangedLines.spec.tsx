import {cleanup, renderHook, waitFor} from '@testing-library/react'
import {expect} from 'chai'
import {useChangedLines} from '../../src/ui/useChangedLines.ts'

describe('useChangedLines', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: liefert zunächst null und nach dem Nachladen die Zahl geänderter Zeilen', async () => {
    const {result} = renderHook(() => useChangedLines({current: 'a\nb\n', original: 'a\nc\n'}))
    expect(result.current).to.equal(null)
    await waitFor(() => expect(result.current).to.equal(2))
  })

  it('Erfolg: ohne Original zählt jede Zeile als neu', async () => {
    const {result} = renderHook(() => useChangedLines({current: 'a\nb\n', original: null}))
    await waitFor(() => expect(result.current).to.equal(2))
  })

  it('Fehlschlag: unveränderter Text ergibt 0, nicht null', async () => {
    const {result} = renderHook(() => useChangedLines({current: 'a\n', original: 'a\n'}))
    await waitFor(() => expect(result.current).to.equal(0))
  })

  it('Erfolg: neue Eingaben berechnen die Zahl neu', async () => {
    const {rerender, result} = renderHook(
      (props: {current: string}) => useChangedLines({current: props.current, original: 'a\n'}),
      {
        initialProps: {current: 'a\n'},
      },
    )
    await waitFor(() => expect(result.current).to.equal(0))
    rerender({current: 'b\n'})
    await waitFor(() => expect(result.current).to.equal(2))
  })
})
