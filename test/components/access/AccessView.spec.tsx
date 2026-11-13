import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import type {PolicyFile} from '../../../src/model/PolicyTypes.ts'
import {AccessView} from '../../../src/ui/access/AccessView.tsx'
import {loadFixturePolicy} from '../loadFixture.ts'

/** Kleine Policy mit je einem gewährten, bedingten und nicht verknüpften Recht. */
const SMALL: PolicyFile = {
  channels: ['WEB', 'APP'],
  providers: [
    {className: 'X', name: 'Aktiv'},
    {className: 'X', name: 'Gesperrt', negation: true},
  ],
  rights: [
    {channels: ['WEB'], description: '', name: 'Statisch', roles: ['PRODUCT_OWNER', 'INTERESTED_PERSON']},
    {
      channels: ['WEB'],
      condition: {conditions: ['Aktiv', 'Gesperrt'], operator: 'AND'},
      description: '',
      name: 'Bedingt',
      roles: ['PRODUCT_OWNER', 'INTERESTED_PERSON'],
    },
    {channels: ['APP'], description: '', name: 'NurApp', roles: ['PRODUCT_OWNER']},
  ],
}

/** Liefert die Rechte-Namen einer Gruppe anhand ihrer Überschrift. */
function namesIn(title: RegExp): string[] {
  const list = screen.getByRole('list', {name: title})
  return within(list)
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
}

describe('AccessView', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: teilt die Rechte für Channel und Rolle in gewährt, bedingt und nicht verfügbar', () => {
    render(<AccessView onOpenRight={() => undefined} policy={SMALL} />)
    expect(namesIn(/Gewährt/)).to.deep.equal(['#1 Statisch'])
    expect(namesIn(/Abhängig von Bedingung/)).to.deep.equal(['#2 BedingtAktiv AND Gesperrt'])
    expect(namesIn(/Nicht verfügbar/)).to.deep.equal(['#3 NurAppChannel WEB fehlt'])
  })

  it('Erfolg: Wechsel von Channel und Rolle ordnet neu ein', async () => {
    const user = userEvent.setup()
    render(<AccessView onOpenRight={() => undefined} policy={SMALL} />)
    await user.selectOptions(screen.getByLabelText('Rolle'), 'INTERESTED_PERSON')
    expect(namesIn(/Gewährt/)).to.deep.equal(['#1 Statisch', '#2 Bedingt'])
    expect(screen.getByText(/erhält verknüpfte Rechte ohne Prüfung der Bedingung/)).to.exist
    await user.selectOptions(screen.getByLabelText('Channel'), 'APP')
    expect(screen.getAllByText('Keine Rechte.')).to.have.length(2)
    expect(namesIn(/Nicht verfügbar/)).to.have.length(3)
  })

  it('Erfolg: Klick auf ein Recht öffnet es über onOpenRight', async () => {
    const onOpenRight = sinon.spy()
    render(<AccessView onOpenRight={onOpenRight} policy={SMALL} />)
    await userEvent.click(screen.getByRole('button', {name: /Bedingt/}))
    expect(onOpenRight.calledOnceWithExactly(1)).to.equal(true)
  })

  it('Erfolg: mit der Produktiv-Datei steht SimkarteSperren für PRODUCT_OWNER in PRIVATESERVICE unter bedingt', () => {
    render(<AccessView onOpenRight={() => undefined} policy={loadFixturePolicy()} />)
    expect(namesIn(/Abhängig von Bedingung/).some((text) => text.startsWith('#4 SimkarteSperren'))).to.equal(true)
  })

  it('Fehlschlag: ohne Channels erscheint ein Hinweis statt der Auswahl', () => {
    render(<AccessView onOpenRight={() => undefined} policy={{channels: [], providers: [], rights: []}} />)
    expect(screen.getByText('Noch keine Channels angelegt.')).to.exist
    expect(screen.queryByLabelText('Channel')).to.equal(null)
  })
})
