import {useState} from 'react'
import {serializePolicy} from './model/serialize.ts'
import {useEditor} from './state/useEditor.ts'
import {DiffDialog} from './ui/DiffDialog.tsx'
import {downloadText} from './ui/download.ts'
import {ErrorBox} from './ui/ErrorBox.tsx'
import {Header} from './ui/Header.tsx'
import {LoadScreen} from './ui/LoadScreen.tsx'
import {parseFindingPath} from './ui/pathTarget.ts'
import type {Selection, TabId} from './ui/Selection.ts'
import {TabBar} from './ui/TabBar.tsx'
import {TabPlaceholder} from './ui/TabPlaceholder.tsx'
import {ValidationPanel} from './ui/ValidationPanel.tsx'

const CONFIRM_TEXT = 'Die Datei enthält Fehler, die den Start des policy-service verhindern. Trotzdem herunterladen?'

/** Wurzel der Anwendung: Ladeansicht oder Editor mit Kopfzeile, Tabs und Prüfergebnis. */
export function App(): React.JSX.Element {
  const {dispatch, state} = useEditor()
  const [reloading, setReloading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [tab, setTab] = useState<TabId>('channels')
  const [selected, setSelected] = useState<Selection | null>(null)

  const clearError = (): void => dispatch({type: 'clearError'})

  if (state.policy === null || reloading) {
    return (
      <LoadScreen
        error={state.error}
        onCancel={state.policy === null ? null : () => setReloading(false)}
        onClearError={clearError}
        onLoad={(text) => {
          dispatch({text, type: 'load'})
          setReloading(false)
          setSelected(null)
        }}
        onNew={() => {
          dispatch({type: 'new'})
          setReloading(false)
          setSelected(null)
        }}
      />
    )
  }

  const policy = state.policy
  const findings = [...state.parseFindings, ...state.findings]
  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warningCount = findings.length - errorCount
  const showUnknownFieldHint = state.parseFindings.some((f) => f.message.startsWith('Unbekanntes Feld'))

  /** Lädt die aktuelle Policy herunter; bei Fehlern in der Prüfung erst nach Rückfrage. */
  function download(): void {
    if (errorCount > 0 && !window.confirm(CONFIRM_TEXT)) {
      return
    }
    downloadText({filename: 'policy.json', text: serializePolicy({policy})})
  }

  /** Springt zum Tab und Eintrag eines Befunds. */
  function select(path: string): void {
    const target = parseFindingPath({path})
    if (target !== null) {
      setTab(target.tab)
      setSelected(target)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        errorCount={errorCount}
        fileLabel={state.original === null ? 'Neue Konfiguration' : 'policy.json'}
        onDiff={() => setShowDiff(true)}
        onDownload={download}
        onReload={() => setReloading(true)}
        warningCount={warningCount}
      />
      {state.error !== null && (
        <div className="px-4 pt-3">
          <ErrorBox message={state.error} onDismiss={clearError} />
        </div>
      )}
      <TabBar
        active={tab}
        onChange={(next) => {
          setTab(next)
          setSelected(null)
        }}
      />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_22rem]">
        <main aria-labelledby={`tab-${tab}`} className="min-w-0 p-4" id={`panel-${tab}`} role="tabpanel" tabIndex={0}>
          <TabPlaceholder selectedIndex={selected !== null && selected.tab === tab ? selected.index : null} tab={tab} />
        </main>
        <ValidationPanel findings={findings} onSelect={select} showUnknownFieldHint={showUnknownFieldHint} />
      </div>
      {showDiff && (
        <DiffDialog current={serializePolicy({policy})} onClose={() => setShowDiff(false)} original={state.original} />
      )}
    </div>
  )
}
