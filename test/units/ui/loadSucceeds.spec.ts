import {expect} from 'chai'
import {loadSucceeds} from '../../../src/ui/loadSucceeds.ts'

describe('loadSucceeds', () => {
  it('Erfolg: gültige policy.json lässt die Ladeansicht schließen', () => {
    expect(loadSucceeds({text: JSON.stringify({channels: ['WEB'], providers: [], rights: []})})).to.equal(true)
  })

  it('Fehlschlag: ungültiges JSON hält die Ladeansicht offen', () => {
    expect(loadSucceeds({text: '{kaputt'})).to.equal(false)
  })
})
