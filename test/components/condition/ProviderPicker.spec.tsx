import {cleanup, render, screen} from '@testing-library/react'
import {expect} from 'chai'
import {ProviderPicker} from '../../../src/ui/condition/ProviderPicker.tsx'

describe('ProviderPicker', () => {
  afterEach(cleanup)

  it('Fehlschlag: ohne Provider steht „Noch keine Provider angelegt“ da', () => {
    render(<ProviderPicker label="Provider hinzufügen" onPick={() => undefined} providers={[]} />)
    expect(screen.getByText('Noch keine Provider angelegt')).to.not.equal(null)
  })

  it('Erfolg: mit Providern erscheint der Hinweis nicht', () => {
    render(
      <ProviderPicker
        label="Provider hinzufügen"
        onPick={() => undefined}
        providers={[{className: 'a.Aktiv', name: 'Vertrag_aktiv'}]}
      />,
    )
    expect(screen.queryByText('Noch keine Provider angelegt')).to.equal(null)
  })
})
