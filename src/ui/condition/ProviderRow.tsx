import {useId} from 'react'
import type {Finding, ProviderDef} from '../../model/PolicyTypes.ts'
import {ActionMenu} from '../kit/ActionMenu.tsx'
import {describeProvider} from '../logic/describeProvider.ts'
import {FindingList} from './FindingList.tsx'

interface ProviderRowProps {
  /** Befunde, die zu dieser Zeile gehören. */
  findings: readonly Finding[]
  isFirst: boolean
  isLast: boolean
  name: string
  onMoveDown: () => void
  onMoveUp: () => void
  onRemove: () => void
  onWrap: () => void
  /** Der Provider zum Namen; `undefined`, wenn er nicht definiert ist. */
  provider: ProviderDef | undefined
}

/** Zeile für einen Provider in einer Bedingungsgruppe: Name, Beschreibung, NICHT-Kennzeichen, Parameterwerte und Menü. */
export function ProviderRow({
  findings,
  isFirst,
  isLast,
  name,
  onMoveDown,
  onMoveUp,
  onRemove,
  onWrap,
  provider,
}: ProviderRowProps): React.JSX.Element {
  const findingsId = useId()
  const unknown = provider === undefined
  return (
    <div
      aria-describedby={findings.length > 0 ? findingsId : undefined}
      aria-label={`Bedingung ${name}`}
      className={`flex items-start gap-2 rounded border px-2 py-1 ${unknown ? 'border-danger bg-danger-soft' : 'border-line bg-surface'}`}
      role="group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-mono break-words ${unknown ? 'text-danger' : ''}`}>{name}</span>
          {unknown && <span className="text-danger">Unbekannter Provider</span>}
          {provider?.negation === true && <span className="rounded bg-not px-1 text-not-fg">NICHT</span>}
        </div>
        {provider?.description !== undefined && provider.description.length > 0 && (
          <div className="break-words">{provider.description}</div>
        )}
        {provider !== undefined && <div className="break-words text-muted">{describeProvider({provider}).short}</div>}
        <FindingList findings={findings} id={findingsId} />
      </div>
      <ActionMenu
        items={[
          {disabled: isFirst, label: 'Nach oben', onSelect: onMoveUp},
          {disabled: isLast, label: 'Nach unten', onSelect: onMoveDown},
          {label: 'In Gruppe fassen', onSelect: onWrap},
          {danger: true, label: 'Entfernen', onSelect: onRemove},
        ]}
        label={`Aktionen für ${name}`}
      />
    </div>
  )
}
