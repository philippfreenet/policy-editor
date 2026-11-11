import {useState} from 'react'
import {serializePolicy} from './model/serialize.ts'
import {useEditor} from './state/useEditor.ts'
import {DiffDialog} from './ui/DiffDialog.tsx'
import {downloadText} from './ui/download.ts'
import {ChannelsTab} from './ui/ChannelsTab.tsx'
import {ErrorBox} from './ui/ErrorBox.tsx'
import {Header} from './ui/Header.tsx'
import {LoadScreen} from './ui/LoadScreen.tsx'
import {loadSucceeds} from './ui/loadSucceeds.ts'
import {parseFindingPath} from './ui/pathTarget.ts'
import type {Selection, TabId} from './ui/Selection.ts'
import {ProvidersTab} from './ui/ProvidersTab.tsx'
import {RightsTab} from './ui/RightsTab.tsx'
import {TabBar} from './ui/TabBar.tsx'
import {ValidationPanel} from './ui/ValidationPanel.tsx'

const DISCARD_TEXT = 'Ungespeicherte Änderungen gehen verloren. Trotzdem fortfahren?'
const CONFIRM_TEXT = 'Die Datei enthält Fehler, die den Start des policy-service verhindern. Trotzdem herunterladen?'

/** Wurzel der Anwendung: Ladeansicht oder Editor mit Kopfzeile, Tabs und Prüfergebnis. */
export function App(): React.JSX.Element {
  const {dispatch, state} = useEditor()
  const [reloading, setReloading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [tab, setTab] = useState<TabId>('channels')
  const [selected, setSelected] = useState<Selection | null>(null)

  const clearError = (): void => dispatch({type: 'clearError'})

  /** Fragt nach, wenn die aktuelle Policy von der geladenen Datei abweicht; true bedeutet: fortfahren. */
  function confirmDiscard(): boolean {
    if (state.policy === null || serializePolicy({policy: state.policy}) === (state.original ?? '')) {
      return true
    }
    return window.confirm(DISCARD_TEXT)
  }

  if (state.policy === null || reloading) {
    return (
      <LoadScreen
        error={state.error}
        onCancel={state.policy === null ? null : () => setReloading(false)}
        onClearError={clearError}
        onLoad={(text) => {
          if (!confirmDiscard()) {
            return
          }
          dispatch({text, type: 'load'})
          if (loadSucceeds({text})) {
            setReloading(false)
            setSelected(null)
          }
        }}
        onNew={() => {
          if (!confirmDiscard()) {
            return
          }
          dispatch({type: 'new'})
          setReloading(false)
          setSelected(null)
        }}
      />
    )
  }

  const policy = state.policy
  const findings = state.findings
  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warningCount = findings.length - errorCount
  const selectedIndex = selected !== null && selected.tab === tab ? selected.index : null
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
          {tab === 'channels' && <ChannelsTab dispatch={dispatch} policy={policy} selected={selectedIndex} />}
          {tab === 'providers' && <ProvidersTab dispatch={dispatch} policy={policy} selected={selectedIndex} />}
          {tab === 'rights' && <RightsTab dispatch={dispatch} policy={policy} selected={selectedIndex} />}
        </main>
        <ValidationPanel
          findings={findings}
          loadNotes={state.parseFindings}
          onSelect={select}
          showUnknownFieldHint={showUnknownFieldHint}
        />
      </div>
      {showDiff && (
        <DiffDialog current={serializePolicy({policy})} onClose={() => setShowDiff(false)} original={state.original} />
      )}
    </div>
  )
}
