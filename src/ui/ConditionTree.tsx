import type {CompositeNode, ProviderDef} from '../model/PolicyTypes.ts'
import {ConditionGroup} from './ConditionGroup.tsx'

interface ConditionTreeProps {
  onChange: (node: CompositeNode) => void
  providers: readonly ProviderDef[]
  value: CompositeNode
}

/** Bearbeitbarer Bedingungsbaum (kontrolliert): rendert die Wurzelgruppe, alle Änderungen liefern den neuen Baum. */
export function ConditionTree({onChange, providers, value}: ConditionTreeProps): React.JSX.Element {
  return <ConditionGroup group={value} onChange={onChange} path={[]} providers={providers} root={value} />
}
