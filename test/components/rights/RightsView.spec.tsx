import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import {readFileSync} from 'node:fs'
import {useReducer, useState} from 'react'
import sinon from 'sinon'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {editorReducer, initialState} from '../../../src/state/editorReducer.ts'
import {changedRights} from '../../../src/ui/logic/changedRights.ts'
import {RightsView} from '../../../src/ui/rights/RightsView.tsx'

const FIXTURE = readFileSync(new URL('../../fixtures/policy-prod.json', import.meta.url), 'utf8')

/** Liest die Produktiv-Policy und wendet eine Anpassung an; liefert den Text für den Reducer. */
function fixtureText(args?: {tweak?: (policy: PolicyFile) => void}): string {
  const policy = JSON.parse(FIXTURE) as PolicyFile
  args?.tweak?.(policy)
  return JSON.stringify(policy)
}

/** Rahmen mit echtem Reducer, damit Dispatches wirken; legt die letzte Policy in `latest` ab. */
function Harness(props: {index: number | null; latest: {policy: PolicyFile | null}; text: string}): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, props.text, (text) =>
    editorReducer(initialState, {text, type: 'load'}),
  )
  const [selection, setSelection] = useState<{field: string | null; index: number | null} | null>(
    props.index === null ? null : {field: null, index: props.index},
  )
  props.latest.policy = state.policy
  if (state.policy === null) {
    return <p>leer</p>
  }
  return (
    <>
      {[5, 7].map((id) => (
        <button key={id} onClick={() => setSelection({field: null, index: id - 1})} type="button">
          Springe zu {id}
        </button>
      ))}
      <button onClick={() => setSelection({field: 'condition', index: 3})} type="button">
        Springe zu Bedingung
      </button>
      <RightsView
        changed={changedRights({original: state.original, policy: state.policy})}
        dispatch={dispatch}
        findings={state.findings}
        policy={state.policy}
        selection={selection}
      />
    </>
  )
}

/** Rendert die Ansicht und liefert Zugriff auf die aktuelle Policy. */
function setup(args?: {index?: number | null; text?: string}): {latest: {policy: PolicyFile | null}} {
  const latest: {policy: PolicyFile | null} = {policy: null}
  render(
    <Harness index={args?.index === undefined ? 3 : args.index} latest={latest} text={args?.text ?? fixtureText()} />,
  )
  return {latest}
}

describe('RightsView', () => {
  afterEach(() => {
    cleanup()
    sinon.restore()
  })

  it('Erfolg: Suche „rolle:SYSTEM channel:APP“ filtert die Liste und zeigt zwei Filter-Chips', async () => {
    const user = userEvent.setup()
    setup({
      text: fixtureText({
        tweak: (p) => {
          p.rights[3]?.roles.push('SYSTEM')
        },
      }),
    })
    await user.type(screen.getByRole('searchbox', {name: 'Rechte suchen'}), 'rolle:SYSTEM channel:APP')
    expect(screen.getByText('1 von 49')).to.exist
    expect(screen.getByRole('button', {name: 'Filter Rolle entfernen'})).to.exist
    expect(screen.getByRole('button', {name: 'Filter Channel entfernen'})).to.exist
    expect(within(screen.getByRole('list', {name: 'Rechte'})).getAllByRole('listitem')).to.have.length(1)
  })

  it('Erfolg: Entfernen eines Filter-Chips hebt den Filter auf', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByRole('searchbox', {name: 'Rechte suchen'}), 'channel:APP')
    expect(screen.queryByText('49 von 49')).to.equal(null)
    await user.click(screen.getByRole('button', {name: 'Filter Channel entfernen'}))
    expect(screen.getByText('49 von 49')).to.exist
    expect(screen.queryByRole('button', {name: 'Filter Channel entfernen'})).to.equal(null)
  })

  it('Erfolg: Filter-Menü setzt genau einen Wert pro Dimension', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', {name: /^Rolle/}))
    await user.click(screen.getByRole('option', {name: 'SYSTEM'}))
    expect(screen.getByRole('button', {name: 'Filter Rolle entfernen'})).to.exist
    expect(screen.getByText('Keine Treffer.')).to.exist
    await user.click(screen.getByRole('button', {name: 'Filter zurücksetzen'}))
    expect(screen.getByText('49 von 49')).to.exist
  })

  it('Erfolg: „+ Neues Recht“ hängt NeuesRecht an und öffnet den Namen im Bearbeitungsmodus', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: '+ Neues Recht'}))
    expect(latest.policy?.rights.at(-1)?.name).to.equal('NeuesRecht')
    const input = screen.getByRole('textbox', {name: 'Name'})
    expect(document.activeElement).to.equal(input)
    expect(screen.getByText('ID 50')).to.exist
  })

  it('Erfolg: Rolle über „+ Rolle“ hinzufügen und per Chip entfernen', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: /^\+ Rolle/}))
    await user.click(screen.getByRole('checkbox', {name: 'SYSTEM'}))
    expect(latest.policy?.rights[3]?.roles).to.include('SYSTEM')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', {name: 'SYSTEM entfernen'}))
    expect(latest.policy?.rights[3]?.roles).to.not.include('SYSTEM')
  })

  it('Erfolg: „Löschen…“ nach Bestätigung entfernt das Recht; Inspektor zeigt Leerzustand', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    expect(screen.getByText(/Recht SimkarteSperren löschen\? Die IDs von 45 folgenden Rechten verschieben sich\./)).to
      .exist
    await user.click(screen.getByRole('button', {name: 'Löschen'}))
    expect(latest.policy?.rights).to.have.length(48)
    expect(latest.policy?.rights.some((r) => r.name === 'SimkarteSperren')).to.equal(false)
    expect(screen.getByText('Recht aus der Liste wählen oder ein neues anlegen.')).to.exist
  })

  it('Erfolg: „Position ändern…“ auf ID 1 verschiebt und behält die Auswahl auf dem Recht', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Position ändern…'}))
    const field = screen.getByRole('spinbutton', {name: 'Neue ID'})
    await user.clear(field)
    await user.type(field, '1')
    expect(screen.getByText('Die IDs von 3 Rechten verschieben sich.')).to.exist
    await user.click(screen.getByRole('button', {name: 'Verschieben'}))
    expect(latest.policy?.rights[0]?.name).to.equal('SimkarteSperren')
    expect(screen.getByText('ID 1')).to.exist
    expect(screen.getByRole('button', {name: 'Name: SimkarteSperren'})).to.exist
  })

  it('Fehlschlag: Umbenennen auf einen vorhandenen Namen zeigt die Fehlermeldung am Feld, der Name bleibt', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: 'Name: SimkarteSperren'}))
    const input = screen.getByRole('textbox', {name: 'Name'})
    await user.clear(input)
    await user.type(input, 'Dashboard{Enter}')
    expect(screen.getByRole('alert').textContent).to.equal('Recht Dashboard existiert bereits')
    expect(latest.policy?.rights[3]?.name).to.equal('SimkarteSperren')
  })

  it('Fehlschlag: Auswahl auf gelöschtem Index (selection.index = rights.length) zeigt den Leerzustand', () => {
    setup({index: 49})
    expect(screen.getByText('Recht aus der Liste wählen oder ein neues anlegen.')).to.exist
  })

  it('Fehlschlag: unbekannte Rolle „FOO“ und unbekannter Channel „BAR“ erscheinen als Fehler-Chips und lassen sich entfernen', async () => {
    const user = userEvent.setup()
    const {latest} = setup({
      text: fixtureText({
        tweak: (p) => {
          p.rights[3]?.roles.push('FOO')
          p.rights[3]?.channels.push('BAR')
        },
      }),
    })
    expect(screen.getByText('FOO').parentElement?.className).to.include('text-danger')
    expect(screen.getByText('BAR').parentElement?.className).to.include('text-danger')
    await user.click(screen.getByRole('button', {name: 'FOO entfernen'}))
    await user.click(screen.getByRole('button', {name: 'BAR entfernen'}))
    expect(latest.policy?.rights[3]?.roles).to.not.include('FOO')
    expect(latest.policy?.rights[3]?.channels).to.not.include('BAR')
  })

  it('Fehlschlag: zwei Rechte gleichen Namens erzeugen keine React-Key-Warnung', () => {
    const spy = sinon.spy(console, 'error')
    setup({
      text: fixtureText({
        tweak: (p) => {
          const copy = structuredClone(p.rights[0])
          if (copy !== undefined) {
            p.rights.push(copy)
          }
        },
      }),
    })
    const keyWarnings = spy.getCalls().filter((call) => String(call.args[0]).includes('same key'))
    expect(keyWarnings).to.have.length(0)
    expect(screen.getAllByText('Dashboard', {exact: false}).length).to.be.greaterThan(1)
  })

  it('Erfolg: 80-Zeichen-Name ohne Leerzeichen hat break-words/min-w-0 im Listeneintrag und in der Überschrift', () => {
    const long = 'A'.repeat(80)
    setup({
      text: fixtureText({
        tweak: (p) => {
          const right = p.rights[3]
          if (right !== undefined) {
            right.name = long
          }
        },
      }),
    })
    const entry = within(screen.getByRole('list', {name: 'Rechte'})).getByText(`#4 ${long}`)
    expect(entry.className).to.include('break-words')
    expect(entry.className).to.include('min-w-0')
    const heading = screen.getByRole('heading', {level: 2, name: new RegExp(long)})
    expect(heading.className).to.include('break-words')
    expect(heading.className).to.include('min-w-0')
  })

  it('Erfolg: geänderte Rechte tragen die Marke „geändert“', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.queryByRole('img', {name: 'geändert'})).to.equal(null)
    await user.click(screen.getByRole('button', {name: /^\+ Rolle/}))
    await user.click(screen.getByRole('checkbox', {name: 'SYSTEM'}))
    expect(screen.getAllByRole('img', {name: 'geändert'})).to.have.length(1)
  })

  it('Erfolg: erneutes Anspringen desselben Rechts wirkt auch nach einem Klick in der Liste', async () => {
    const user = userEvent.setup()
    setup({index: null})
    await user.click(screen.getByRole('button', {name: 'Springe zu 5'}))
    expect(screen.getByText('ID 5')).to.exist
    await user.click(within(screen.getByRole('list', {name: 'Rechte'})).getByRole('button', {name: /^#7 /}))
    expect(screen.getByText('ID 7')).to.exist
    await user.click(screen.getByRole('button', {name: 'Springe zu 5'}))
    expect(screen.getByText('ID 5')).to.exist
  })

  it('Fehlschlag: leere oder ungültige Zielposition sperrt „Verschieben“ und verschiebt nichts', async () => {
    const user = userEvent.setup()
    const {latest} = setup()
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Position ändern…'}))
    const field = screen.getByRole('spinbutton', {name: 'Neue ID'})
    await user.clear(field)
    expect((screen.getByRole('button', {name: 'Verschieben'}) as HTMLButtonElement).disabled).to.equal(true)
    expect(screen.getByRole('alert').textContent).to.include('1 bis 49')
    await user.type(field, '99')
    expect((screen.getByRole('button', {name: 'Verschieben'}) as HTMLButtonElement).disabled).to.equal(true)
    expect(latest.policy?.rights[3]?.name).to.equal('SimkarteSperren')
  })

  it('Erfolg: genau 7 Channels werden auf 6 gekürzt und mit „+ 1 weitere“ aufgeklappt', async () => {
    const user = userEvent.setup()
    setup({
      text: fixtureText({
        tweak: (p) => {
          const right = p.rights[3]
          if (right !== undefined) {
            right.channels = p.channels.slice(0, 7)
          }
        },
      }),
    })
    const wo = screen.getByRole('region', {name: 'Wo'})
    expect(within(wo).getAllByRole('button', {name: /entfernen$/})).to.have.length(6)
    await user.click(within(wo).getByRole('button', {name: '+ 1 weitere'}))
    expect(within(wo).getAllByRole('button', {name: /entfernen$/})).to.have.length(7)
    expect(within(wo).getByRole('button', {name: 'weniger'})).to.exist
  })

  it('Erfolg: nach „Löschen…“ liegt der Fokus in der Liste', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    await user.click(screen.getByRole('button', {name: 'Löschen'}))
    expect(screen.getByRole('list', {name: 'Rechte'}).contains(document.activeElement)).to.equal(true)
  })

  it('Erfolg: Feldsprung auf „condition“ fokussiert im Wann-Block', async () => {
    const user = userEvent.setup()
    setup({index: null})
    await user.click(screen.getByRole('button', {name: 'Springe zu Bedingung'}))
    expect(screen.getByRole('region', {name: 'Wann'}).contains(document.activeElement)).to.equal(true)
  })

  it('Erfolg: „alle“ im Channel-Picker behält unbekannte Channels, „keine“ leert alles', async () => {
    const user = userEvent.setup()
    const {latest} = setup({
      text: fixtureText({
        tweak: (p) => {
          const right = p.rights[3]
          if (right !== undefined) {
            right.channels = ['BAR', 'APP']
          }
        },
      }),
    })
    await user.click(screen.getByRole('button', {name: /^\+ Channel/}))
    await user.click(screen.getByRole('button', {name: 'alle'}))
    const channels = latest.policy?.rights[3]?.channels ?? []
    expect(channels).to.include('BAR')
    expect(channels).to.have.length(12)
    await user.click(screen.getByRole('button', {name: 'keine'}))
    expect(latest.policy?.rights[3]?.channels).to.deep.equal([])
  })

  it('Erfolg: Singular im Löschen-Text bei genau einem folgenden Recht', async () => {
    const user = userEvent.setup()
    setup({index: 47})
    await user.click(screen.getByRole('button', {name: 'Aktionen für Recht'}))
    await user.click(screen.getByRole('menuitem', {name: 'Löschen…'}))
    expect(screen.getByText(/Die ID von 1 folgenden Recht verschiebt sich\./)).to.exist
  })

  it('Fehlschlag: doppelte Channel-Namen erzeugen keine Key-Warnung im Filter', async () => {
    const user = userEvent.setup()
    const spy = sinon.spy(console, 'error')
    setup({
      text: fixtureText({
        tweak: (p) => {
          p.channels.push('APP')
        },
      }),
    })
    await user.click(screen.getByRole('button', {name: /^Channel/}))
    expect(spy.getCalls().filter((c) => String(c.args[0]).includes('same key'))).to.have.length(0)
  })
})
