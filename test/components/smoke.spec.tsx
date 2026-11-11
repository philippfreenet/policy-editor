import {cleanup, render, screen} from '@testing-library/react'
import {expect} from 'chai'

describe('Komponententest-Setup', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: rendert eine Komponente in jsdom', () => {
    render(<button type="button">Hallo</button>)
    expect(screen.getByRole('button', {name: 'Hallo'})).to.exist
  })
})
