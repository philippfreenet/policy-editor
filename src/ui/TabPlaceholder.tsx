import type {TabId} from './Selection.ts'

interface TabPlaceholderProps {
  selectedIndex: number | null
  tab: TabId
}

/** Platzhalter für den Tab-Inhalt; wird von den Tab-Komponenten (Channels, Provider, Rechte) ersetzt. */
export function TabPlaceholder({selectedIndex, tab}: TabPlaceholderProps): React.JSX.Element {
  return (
    <p className="text-sm text-slate-700" data-selected-index={selectedIndex ?? undefined} data-tab={tab}>
      Kommt in Kürze.
    </p>
  )
}
