import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect} from 'chai'
import sinon from 'sinon'
import {ChipSelect} from '../../../src/ui/kit/ChipSelect.tsx'

describe('ChipSelect', () => {
  afterEach(() => {
    cleanup()
  })

  it('Erfolg: Häkchen fügt hinten an', async () => {
    const user = userEvent.setup()
    const onChange = sinon.spy()
    render(<ChipSelect label="Rollen" onChange={onChange} options={['a', 'b', 'c']} selected={['c']} />)
    await user.click(screen.getByRole('button', {name: /Rollen/}))
    await user.click(screen.getByRole('checkbox', {name: 'a'}))
    expect(onChange.calledOnceWith(['c', 'a'])).to.equal(true)
  })

  it('Erfolg: Abwahl entfernt', async () => {
    const user = userEvent.setup()
    const onChange = sinon.spy()
    render(<ChipSelect label="Rollen" onChange={onChange} options={['a', 'b']} selected={['a', 'b']} />)
    await user.click(screen.getByRole('button', {name: /Rollen/}))
    await user.click(screen.getByRole('checkbox', {name: 'a'}))
    expect(onChange.calledOnceWith(['b'])).to.equal(true)
  })

  it('Erfolg: „alle“/„keine“', async () => {
    const user = userEvent.setup()
    const onChange = sinon.spy()
    render(<ChipSelect label="Rollen" onChange={onChange} options={['a', 'b']} selected={['b']} showAllNone />)
    await user.click(screen.getByRole('button', {name: /Rollen/}))
    await user.click(screen.getByRole('button', {name: 'alle'}))
    await user.click(screen.getByRole('button', {name: 'keine'}))
    expect(onChange.firstCall.args[0]).to.deep.equal(['a', 'b'])
    expect(onChange.secondCall.args[0]).to.deep.equal([])
  })

  it('Erfolg: Suche filtert die Liste', async () => {
    const user = userEvent.setup()
    render(<ChipSelect label="Rollen" onChange={() => {}} options={['admin', 'user']} searchable selected={[]} />)
    await user.click(screen.getByRole('button', {name: /Rollen/}))
    await user.type(screen.getByRole('searchbox', {name: 'Rollen suchen'}), 'adm')
    expect(screen.getAllByRole('checkbox').map((c) => (c as HTMLInputElement).value)).to.deep.equal(['admin'])
  })

  it('Fehlschlag: Escape schließt ohne Änderung', async () => {
    const user = userEvent.setup()
    const onChange = sinon.spy()
    render(<ChipSelect label="Rollen" onChange={onChange} options={['a']} selected={[]} />)
    await user.click(screen.getByRole('button', {name: /Rollen/}))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox')).to.equal(null)
    expect(onChange.called).to.equal(false)
  })
})
