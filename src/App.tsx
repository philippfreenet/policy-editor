import {useEffect, useState} from 'react'
import {serializePolicy} from './model/serialize.ts'
import {useEditor} from './state/useEditor.ts'
import {ChannelsView} from './ui/channels/ChannelsView.tsx'
import {downloadText} from './ui/download.ts'
import {ConfirmDialog} from './ui/kit/ConfirmDialog.tsx'
import {Toast} from './ui/kit/Toast.tsx'
import {changedRights} from './ui/logic/changedRights.ts'
import {viewTarget} from './ui/logic/viewTarget.ts'
import type {View} from './ui/logic/viewTarget.ts'
import {loadSucceeds} from './ui/loadSucceeds.ts'
import {OverviewView} from './ui/overview/OverviewView.tsx'
import {ProvidersView} from './ui/providers/ProvidersView.tsx'
import {RightsView} from './ui/rights/RightsView.tsx'
import {AppShell} from './ui/shell/AppShell.tsx'
import {DiffDialog} from './ui/shell/DiffDialog.tsx'
import {FindingsDrawer} from './ui/shell/FindingsDrawer.tsx'
import {Sidebar} from './ui/shell/Sidebar.tsx'
import {StartScreen} from './ui/shell/StartScreen.tsx'
import {TopBar} from './ui/shell/TopBar.tsx'
import {undoShortcut} from './ui/undoShortcut.ts'

const DISCARD_TEXT = 'Ungespeicherte Änderungen gehen verloren. Trotzdem fortfahren?'
const CONFIRM_TEXT = 'Die Datei enthält Fehler, die den Start des policy-service verhindern. Trotzdem herunterladen?'

/** Ausgewählter Eintrag (und ggf. Feld) innerhalb der aktuellen Ansicht. */
interface EntrySelection {
  field: string | null
  index: number | null
}

/** Wurzel der Anwendung: Startbildschirm oder Editor mit Seitenleiste, Kopfleiste und Prüf-Panel. */
export function App(): React.JSX.Element {
  const {dispatch, state} = useEditor()
  const [reloading, setReloading] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [findingsOpen, setFindingsOpen] = useState(false)
  const [view, setView] = useState<View>('rights')
  const [selection, setSelection] = useState<EntrySelection | null>(null)
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null)
  const [confirmDownload, setConfirmDownload] = useState(false)
  const [toast, setToast] = useState<{id: number; message: string} | null>(null)

  const clearError = (): void => dispatch({type: 'clearError'})
  const editing = state.policy !== null && !reloading
  const dialogOpen = diffOpen || findingsOpen || confirmDownload || pendingDiscard !== null

  /* Tastenkürzel für Rückgängig/Wiederholen; Textfelder behalten ihr eigenes Undo */
  useEffect(() => {
    if (!editing || dialogOpen) {
      return undefined
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const action = undoShortcut({event})
      if (action !== null) {
        event.preventDefault()
        dispatch({type: action})
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, dialogOpen, editing])

  /** Führt die Aktion aus; weicht die Policy von der geladenen Datei ab, erst nach Bestätigung im Dialog. */
  function runUnlessDiscarding(action: () => void): void {
    if (state.policy === null || serializePolicy({policy: state.policy}) === (state.original ?? '')) {
      action()
      return
    }
    setPendingDiscard(() => action)
  }

  /** Lädt Text als neue Policy und kehrt bei Erfolg in den Editor zurück. */
  function load(text: string): void {
    runUnlessDiscarding(() => {
      dispatch({text, type: 'load'})
      if (loadSucceeds({text})) {
        setReloading(false)
        setSelection(null)
        setView('rights')
      }
    })
  }

  const discardDialog = (
    <ConfirmDialog
      confirmLabel="Verwerfen"
      danger
      onCancel={() => setPendingDiscard(null)}
      onConfirm={() => {
        const action = pendingDiscard
        setPendingDiscard(null)
        action?.()
      }}
      open={pendingDiscard !== null}
      title="Änderungen verwerfen?"
    >
      {DISCARD_TEXT}
    </ConfirmDialog>
  )

  if (state.policy === null || reloading) {
    return (
      <>
        <StartScreen
          error={state.error}
          hasAutosave={state.policy !== null}
          onCancel={null}
          onClearError={clearError}
          onLoad={load}
          onNew={() =>
            runUnlessDiscarding(() => {
              dispatch({type: 'new'})
              setReloading(false)
              setSelection(null)
              setView('rights')
            })
          }
          onResume={state.policy === null ? null : () => setReloading(false)}
        />
        {discardDialog}
      </>
    )
  }

  const policy = state.policy
  const findings = state.findings
  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warningCount = findings.length - errorCount
  const changed = changedRights({original: state.original, policy})
  const showUnknownFieldHint = state.parseFindings.some((f) => f.message.startsWith('Unbekanntes Feld'))

  /** Lädt die aktuelle Policy herunter und zeigt die Bestätigungsmeldung. */
  function doDownload(): void {
    downloadText({filename: 'policy.json', text: serializePolicy({policy})})
    setToast((previous) => ({id: (previous?.id ?? 0) + 1, message: 'policy.json heruntergeladen'}))
  }

  /** Lädt herunter; bei Fehlern in der Prüfung erst nach Rückfrage. */
  function download(): void {
    if (errorCount > 0) {
      setConfirmDownload(true)
      return
    }
    doDownload()
  }

  /** Öffnet ein Recht im Inspektor der Rechte-Ansicht (jedes Mal mit frischem Auswahl-Objekt). */
  function openRight(index: number): void {
    setView('rights')
    setSelection({field: null, index})
  }

  /** Springt zur Ansicht und zum Eintrag eines Befunds. */
  function select(path: string): void {
    const target = viewTarget({path})
    if (target !== null) {
      setView(target.view)
      setSelection({field: target.field, index: target.index})
      setFindingsOpen(false)
    }
  }

  return (
    <>
      <AppShell
        drawer={
          <FindingsDrawer
            findings={findings}
            loadNotes={state.parseFindings}
            onClose={() => setFindingsOpen(false)}
            onSelect={select}
            open={findingsOpen}
            showUnknownFieldHint={showUnknownFieldHint}
          />
        }
        error={state.error}
        onClearError={clearError}
        sidebar={
          <Sidebar
            changedCount={changed.size}
            counts={{
              channels: policy.channels.length,
              providers: policy.providers.length,
              rights: policy.rights.length,
            }}
            errorCount={errorCount}
            onOpenChanges={() => setDiffOpen(true)}
            onOpenFindings={() => setFindingsOpen(true)}
            onSelect={(next) => {
              setView(next)
              setSelection(null)
            }}
            view={view}
            warningCount={warningCount}
          />
        }
        topBar={
          <TopBar
            canRedo={state.future.length > 0}
            canUndo={state.past.length > 0}
            fileLabel={state.original === null ? 'Neue Konfiguration' : 'policy.json'}
            onDownload={download}
            onRedo={() => dispatch({type: 'redo'})}
            onReload={() => setReloading(true)}
            onUndo={() => dispatch({type: 'undo'})}
          />
        }
      >
        {view === 'channels' && (
          <ChannelsView
            dispatch={dispatch}
            findings={findings}
            onOpenRight={openRight}
            policy={policy}
            selection={selection}
          />
        )}
        {view === 'providers' && (
          <ProvidersView
            dispatch={dispatch}
            findings={findings}
            onOpenRight={openRight}
            policy={policy}
            selection={selection}
          />
        )}
        {view === 'rights' && (
          <RightsView changed={changed} dispatch={dispatch} findings={findings} policy={policy} selection={selection} />
        )}
        {view === 'overview' && <OverviewView onOpenRight={openRight} policy={policy} />}
      </AppShell>
      {diffOpen && (
        <DiffDialog
          current={serializePolicy({policy})}
          onClose={() => setDiffOpen(false)}
          open
          original={state.original}
        />
      )}
      <ConfirmDialog
        confirmLabel="Herunterladen"
        onCancel={() => setConfirmDownload(false)}
        onConfirm={() => {
          setConfirmDownload(false)
          doDownload()
        }}
        open={confirmDownload}
        title="Datei enthält Fehler"
      >
        {CONFIRM_TEXT}
      </ConfirmDialog>
      {discardDialog}
      <Toast message={toast?.message ?? null} onDone={() => setToast(null)} showId={toast?.id} />
    </>
  )
}
