import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {useState} from 'react'
import type {CompositeNode, Finding, ProviderDef} from '../../../src/model/PolicyTypes.ts'
import {ConditionBuilder} from '../../../src/ui/condition/ConditionBuilder.tsx'

const PROVIDERS: ProviderDef[] = [
  {className: 'a.Aktiv', name: 'Vertrag_aktiv'},
  {className: 'a.Kein', description: 'Wird nicht per Prepaid bezahlt', name: 'Kein_Prepaidvertrag', negation: true},
  {className: 'a.Prepaid', description: 'Wird per Prepaid bezahlt', name: 'Prepaidvertrag'},
]

/** Zustandsbehafteter Rahmen: reicht onChange in value zurück und meldet den letzten Wert. */
function Harness(props: {
  findings?: Finding[]
  initial: CompositeNode | undefined
  onValue: (v: CompositeNode | undefined) => void
}): React.JSX.Element {
  const [value, setValue] = useState<CompositeNode | undefined>(props.initial)
  return (
    <ConditionBuilder
      findings={props.findings ?? []}
      onChange={(next) => {
        props.onValue(next)
        setValue(next)
      }}
      pathPrefix="rights[0].condition"
      providers={PROVIDERS}
      value={value}
    />
  )
}

/** Rendert den Rahmen und liefert einen Zugriff auf den zuletzt gemeldeten Wert. */
function setup(initial: CompositeNode | undefined, findings?: Finding[]): {last: () => CompositeNode | undefined} {
  let current = initial
  render(
    <Harness
      findings={findings}
      initial={initial}
      onValue={(v) => {
        current = v
      }}
    />,
  )
  return {last: () => current}
}

describe('ConditionBuilder', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: Umschalten auf „Mindestens eine“ setzt operator OR an der Wurzel', async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Vertrag_aktiv'], operator: 'AND'})
    expect(screen.getByRole('button', {name: 'Alle'}).getAttribute('aria-pressed')).to.equal('true')
    await user.click(screen.getByRole('button', {name: 'Mindestens eine'}))
    expect(s.last()).to.deep.equal({conditions: ['Vertrag_aktiv'], operator: 'OR'})
    expect(screen.getByText('der folgenden treffen zu')).to.exist
  })

  it('Erfolg: Suche „prepaid“ findet beide Prepaid-Provider über die Beschreibung; Auswahl fügt „Kein_Prepaidvertrag“ hinten an', async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Vertrag_aktiv'], operator: 'AND'})
    await user.type(screen.getByRole('combobox', {name: 'Provider hinzufügen'}), 'prepaid')
    const options = screen.getAllByRole('option')
    expect(options).to.have.length(2)
    await user.click(screen.getByRole('option', {name: /Kein_Prepaidvertrag/}))
    expect(s.last()).to.deep.equal({conditions: ['Vertrag_aktiv', 'Kein_Prepaidvertrag'], operator: 'AND'})
    expect((screen.getByRole('combobox', {name: 'Provider hinzufügen'}) as HTMLInputElement).value).to.equal('')
  })

  it("Erfolg: „+ Gruppe“ fügt {operator:'AND', conditions:[]} an", async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Vertrag_aktiv'], operator: 'OR'})
    await user.click(screen.getByRole('button', {name: '+ Gruppe'}))
    expect(s.last()).to.deep.equal({conditions: ['Vertrag_aktiv', {conditions: [], operator: 'AND'}], operator: 'OR'})
  })

  it('Erfolg: „Gruppe auflösen“ an [0] ersetzt die Gruppe durch ihre Kinder', async () => {
    const user = userEvent.setup()
    const s = setup({
      conditions: [{conditions: ['Vertrag_aktiv', 'Prepaidvertrag'], operator: 'OR'}, 'Kein_Prepaidvertrag'],
      operator: 'AND',
    })
    const group = screen.getByRole('group', {name: 'Gruppe 1.1'})
    await user.click(within(group).getByRole('button', {name: 'Aktionen für Gruppe 1.1'}))
    await user.click(screen.getByRole('menuitem', {name: 'Gruppe auflösen'}))
    expect(s.last()).to.deep.equal({
      conditions: ['Vertrag_aktiv', 'Prepaidvertrag', 'Kein_Prepaidvertrag'],
      operator: 'AND',
    })
  })

  it('Erfolg: verschachtelte Gruppe auf Tiefe 3 wird gerendert und ist bearbeitbar', async () => {
    const user = userEvent.setup()
    const s = setup({
      conditions: [{conditions: [{conditions: ['Vertrag_aktiv'], operator: 'AND'}], operator: 'AND'}],
      operator: 'AND',
    })
    const deep = screen.getByRole('group', {name: 'Gruppe 1.1.1'})
    await user.click(within(deep).getByRole('button', {name: 'Mindestens eine'}))
    expect(s.last()).to.deep.equal({
      conditions: [{conditions: [{conditions: ['Vertrag_aktiv'], operator: 'OR'}], operator: 'AND'}],
      operator: 'AND',
    })
  })

  it('Erfolg: NICHT-Kennzeichen erscheint bei negation true', () => {
    setup({conditions: ['Kein_Prepaidvertrag', 'Vertrag_aktiv'], operator: 'AND'})
    expect(screen.getAllByText('NICHT')).to.have.length(1)
    expect(screen.getAllByText('Wird nicht per Prepaid bezahlt').length).to.be.greaterThan(0)
  })

  it('Fehlschlag: unbekannter Provider wird als Fehlerzeile angezeigt und lässt sich entfernen', async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Gibt_es_nicht', 'Vertrag_aktiv'], operator: 'AND'})
    expect(screen.getByText('Unbekannter Provider')).to.exist
    await user.click(screen.getByRole('button', {name: 'Aktionen für Gibt_es_nicht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Entfernen'}))
    expect(s.last()).to.deep.equal({conditions: ['Vertrag_aktiv'], operator: 'AND'})
  })

  it('Fehlschlag: Operator „XOR“ zeigt Hinweis, Klick auf „Alle“ setzt AND', async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Vertrag_aktiv'], operator: 'XOR'})
    expect(screen.getByText('Ungültiger Operator „XOR“ – Alle oder Mindestens eine wählen')).to.exist
    expect(screen.getByRole('button', {name: 'Alle'}).getAttribute('aria-pressed')).to.equal('false')
    expect(screen.getByRole('button', {name: 'Mindestens eine'}).getAttribute('aria-pressed')).to.equal('false')
    await user.click(screen.getByRole('button', {name: 'Alle'}))
    expect(s.last()?.operator).to.equal('AND')
    expect(screen.queryByText(/Ungültiger Operator/)).to.equal(null)
  })

  it('Fehlschlag: leere Gruppe zeigt Hinweis statt leerer Fläche', () => {
    setup({conditions: [], operator: 'AND'})
    expect(screen.getByText('Leere Gruppe – Provider oder Gruppe hinzufügen')).to.exist
  })

  it('Erfolg: „+ Bedingung“ bei undefined, „Bedingung entfernen“ liefert undefined', async () => {
    const user = userEvent.setup()
    const s = setup(undefined)
    expect(screen.getByText('Gilt immer')).to.exist
    await user.click(screen.getByRole('button', {name: '+ Bedingung'}))
    expect(s.last()).to.deep.equal({conditions: [], operator: 'AND'})
    await user.click(screen.getByRole('button', {name: 'Bedingung entfernen (gilt immer)'}))
    expect(s.last()).to.equal(undefined)
    expect(screen.getByText('Gilt immer')).to.exist
  })

  it('Erfolg: Zeilen-Menü verschiebt und fasst in Gruppe', async () => {
    const user = userEvent.setup()
    const s = setup({conditions: ['Vertrag_aktiv', 'Prepaidvertrag'], operator: 'AND'})
    await user.click(screen.getByRole('button', {name: 'Aktionen für Prepaidvertrag'}))
    await user.click(screen.getByRole('menuitem', {name: 'Nach oben'}))
    expect(s.last()?.conditions).to.deep.equal(['Prepaidvertrag', 'Vertrag_aktiv'])
    await user.click(screen.getByRole('button', {name: 'Aktionen für Vertrag_aktiv'}))
    await user.click(screen.getByRole('menuitem', {name: 'In Gruppe fassen'}))
    expect(s.last()?.conditions).to.deep.equal(['Prepaidvertrag', {conditions: ['Vertrag_aktiv'], operator: 'AND'}])
  })

  it('Erfolg: Befunde erscheinen am zugehörigen Knoten, auch bei Pfad-Fortsetzung und unbekanntem Pfad an der Wurzel', () => {
    setup({conditions: ['Vertrag_aktiv', {conditions: ['Prepaidvertrag'], operator: 'XOR'}], operator: 'AND'}, [
      {message: 'Provider fehlt', path: 'rights[0].condition.conditions[0]', severity: 'error'},
      {message: 'Operator falsch', path: 'rights[0].condition.conditions[1].operator', severity: 'error'},
      {message: 'Irgendwo', path: 'rights[0].condition.conditions[9]', severity: 'warning'},
    ])
    const row = screen.getByRole('group', {name: 'Bedingung Vertrag_aktiv'})
    expect(within(row).getByText('Provider fehlt')).to.exist
    const inner = screen.getByRole('group', {name: 'Gruppe 1.2'})
    expect(within(inner).getByText('Operator falsch')).to.exist
    const root = screen.getByRole('group', {name: 'Gruppe 1'})
    expect(within(root).getByText('Irgendwo')).to.exist
    expect(row.getAttribute('aria-describedby')).to.be.a('string')
  })
})
