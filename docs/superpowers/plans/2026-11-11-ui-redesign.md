# policy-editor UI-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Oberfläche des policy-editor als Inspektor „Wer · Wo · Wann“ mit Block-Editor für Bedingungen im Stil „Ruhig & dicht“ neu bauen, ohne Modell, State oder Dateiformat zu ändern.

**Architecture:** `src/model/` und `src/state/` bleiben unangetastet; neue reine Funktionen landen in `src/ui/logic/` (React-frei, Mocha-getestet). Die UI wird in einer neuen Shell (Seitenleiste + Kopfleiste + Ansicht) aufgebaut; bis die neuen Ansichten fertig sind, hängen die alten Tabs in der neuen Shell, damit die App nach jedem Task lauffähig bleibt. Zugängliche Popover/Menüs/Dialoge/Comboboxen kommen aus Headless UI; Komponenten werden mit Testing Library unter jsdom getestet.

**Tech Stack:** React 19.3, TypeScript 7 (strict), Vite 8, Tailwind CSS 4.3 (`@theme`), `@headlessui/react` 2.x, Mocha 12 + Chai + Sinon via tsx, `@testing-library/react` + `@testing-library/user-event` + `global-jsdom`/`jsdom`.

**Spec:** `docs/superpowers/specs/2026-11-11-ui-redesign-design.md` (Basis: `docs/superpowers/specs/2026-11-11-policy-editor-design.md`)

## Global Constraints

- Alles lokal: kein `git remote add`, kein `git push`, keine Netzwerkdienste außer der npm-Registry für die Installation in Task 1.
- Arbeiten auf Branch `feat/ui-redesign`; Commits nach den Team-Typen (`feat`, `fix`, `test`, `refactor`, `chore`, `build`), Beschreibung deutsch in Gegebenheitsform.
- `src/model/**`, `src/state/**`, `src/constants.ts` werden **nicht** verändert.
- Neue Pakete exakt gepinnt (`--save-exact`), nur Versionen ≥ 3 Tage alt: `npm install --before=2026-11-08 --save-exact …`; `npm audit` = 0.
- Code-Konventionen des Repos: `args`-Objekte statt Positionsparameter, JSDoc über jeder Funktion/Komponente, erklärende Kommentare als `/* … */`, Union Types statt Enums, keine `TODO`.
- Tests deutsch mit Präfix `Erfolg:` / `Fehlschlag:`.
- UI-Texte deutsch; Anführungszeichen paarweise „…“.
- Stil „Ruhig & dicht“: Systemschriften (`system-ui`, `ui-monospace`), 13px Grundschrift, kühles Grau, ein Indigo-Akzent, Linien statt Schatten, keine Karten in Karten, keine Verläufe; Dunkelmodus über `prefers-color-scheme`; Bewegung aus bei `prefers-reduced-motion`.
- WCAG 2.2 AA: Kontrast AA hell und dunkel, sichtbarer Fokus, Klickflächen ≥ 24 × 24 px, alles per Tastatur.
- Zielbreiten 1440 × 900 und 1024 × 768; darunter gestapelt und bedienbar.
- Abgelehnte Operationen am Feld: Komponenten, die umbenennen/anlegen, rufen die reine Operation aus `operations.ts` vorab in `try/catch` auf (`OperationError`); bei Fehler wird die Meldung am Feld gezeigt und **nicht** dispatcht, sonst wird dieselbe Operation per `dispatch({apply, type: 'edit'})` ausgeführt. Sonstige `state.error`-Meldungen zeigt die Shell als schließbare Meldung (`role="alert"`) unter der Kopfleiste.
- Vor jedem Commit grün: `npx tsc -b`, `npx mocha`, `npx prettier --check .`.

## Review Focus

1. Lange Namen/Beschreibungen (z. B. 80 Zeichen ohne Leerzeichen) brechen in Liste, Inspektor und Provider-Zeile um, statt das Layout zu sprengen — Test in Task 6.
2. Ungültige Daten aus der Datei (unbekannte Rolle, unbekannter Channel, unbekannter Provider, Operator `XOR`, leere Gruppe) werden angezeigt und sind korrigierbar, ohne Absturz — Tests in Task 5 und Task 6.
3. Nach Rückgängig/Löschen zeigt der Inspektor nie ein nicht mehr existierendes Recht (Auswahl außerhalb der Liste → Leerzustand) — Test in Task 6.
4. Doppelte Namen (zwei Rechte oder Provider gleichen Namens) erzeugen keine React-Key-Kollisionen und keine falsche „geändert“-Markierung — Tests in Task 2 und Task 6.
5. Tastenkürzel `/`, ↑/↓ greifen nicht, während in einem Textfeld getippt wird; nach dem Schließen eines Dialogs liegt der Fokus wieder auf dem Auslöser — Tests in Task 3 und Task 8.

---

## Dateistruktur

| Datei | Verantwortung |
| --- | --- |
| `src/index.css` | Tailwind-Import, `@theme`-Tokens hell/dunkel, Basisstile |
| `src/ui/logic/parseSearch.ts` | Suchzeile → `RightFilter` |
| `src/ui/logic/summarizeRight.ts` | Zusammenfassung eines Rechts |
| `src/ui/logic/describeProvider.ts` | Satz- und Kurzbeschreibung eines Providers |
| `src/ui/logic/findingsAt.ts` | Befunde unter einem Pfad-Präfix |
| `src/ui/logic/changedRights.ts` | geänderte Rechte gegenüber dem Original |
| `src/ui/logic/viewTarget.ts` | Befund-Pfad → Ansicht, Index, Feld (ersetzt `pathTarget.ts`) |
| `src/ui/conditionTreeOps.ts` | + `dissolveGroupAt`, + `wrapInGroupAt` |
| `src/ui/kit/InlineEdit.tsx`, `ConfirmDialog.tsx`, `ActionMenu.tsx`, `ChipSelect.tsx`, `Chip.tsx`, `Toast.tsx` | Bausteine |
| `src/ui/shell/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `StartScreen.tsx`, `FindingsDrawer.tsx`, `DiffDialog.tsx` | Rahmen |
| `src/ui/condition/ConditionBuilder.tsx`, `ConditionGroupBlock.tsx`, `ProviderRow.tsx`, `ProviderPicker.tsx` | Block-Editor |
| `src/ui/rights/RightsView.tsx`, `RightList.tsx`, `RightInspector.tsx` | Rechte |
| `src/ui/providers/ProvidersView.tsx`, `ProviderInspector.tsx` (nutzt `ParamEditor`/`ParamRow` weiter) | Provider |
| `src/ui/channels/ChannelsView.tsx`, `src/ui/overview/OverviewView.tsx` | Channels, Übersicht |
| `src/ui/useShortcuts.ts` | `/`, ↑/↓, Undo/Redo |
| `test/setup/dom.ts` | jsdom-Umgebung für Komponententests |
| `test/components/**/*.spec.tsx` | Komponententests |

Entfallen am Ende (Task 8): `TabBar.tsx`, `Header.tsx`, `LoadScreen.tsx`, `ValidationPanel.tsx`, `ErrorBox.tsx`, `ChannelsTab.tsx`, `ProvidersTab.tsx`, `ProviderForm.tsx`, `RightsTab.tsx`, `RightForm.tsx`, `ConditionTree.tsx`, `ConditionGroup.tsx`, `ConditionLeaf.tsx`, `NameInput.tsx`, `UsageList.tsx`, `MatrixTab.tsx`, `Selection.ts`, `pathTarget.ts` (+ Test), `styles.ts`, alter `DiffDialog.tsx`.

---

### Task 1: Werkzeuge und Design-Tokens

**Files:**
- Modify: `package.json`, `package-lock.json`, `.mocharc.json`, `tsconfig.test.json`, `src/index.css`
- Create: `test/setup/dom.ts`, `test/components/smoke.spec.tsx`

**Interfaces:**
- Produces: Komponententests unter `test/components/**/*.spec.tsx` laufen mit `npx mocha`; jsdom ist global (`document`, `window`) verfügbar; Tailwind-Utilities `bg-surface`, `bg-sidebar`, `bg-canvas`, `border-line`, `text-fg`, `text-muted`, `text-accent`, `bg-accent`, `bg-accent-soft`, `bg-who`, `text-who-fg`, `bg-where`, `text-where-fg`, `bg-not`, `text-not-fg`, `text-danger`, `bg-danger-soft`, `text-warn`, `bg-warn-soft`, `text-ok`.

- [ ] **Step 1: Pakete installieren**

```bash
npm install --before=2026-11-08 --save-exact @headlessui/react
npm install --before=2026-11-08 --save-exact -D @testing-library/react @testing-library/dom @testing-library/user-event jsdom global-jsdom
npm audit
```
Expected: `found 0 vulnerabilities`. Versionen in `package.json` ohne `^`.

- [ ] **Step 2: jsdom-Setup und Mocha-Konfiguration**

`test/setup/dom.ts` registriert `global-jsdom` (URL `http://localhost/`) und ergänzt fehlende Browser-APIs, die Headless UI braucht (`ResizeObserver`-Stub, `window.matchMedia`-Stub, `Element.prototype.scrollIntoView` als No-op). `.mocharc.json`: `"spec": ["test/**/*.spec.ts", "test/**/*.spec.tsx"]`, `"require": ["test/setup/dom.ts"]` (bestehendes `node-option: import=tsx` bleibt). `tsconfig.test.json` schließt `test/**/*.tsx` ein.

- [ ] **Step 3: Smoke-Test schreiben**

```tsx
// test/components/smoke.spec.tsx
it('Erfolg: rendert eine Komponente in jsdom', () => {
  render(<button type="button">Hallo</button>)
  expect(screen.getByRole('button', {name: 'Hallo'})).to.exist
})
```
mit `afterEach(cleanup)`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx mocha` — Expected: 188 passing (187 + Smoke).

- [ ] **Step 5: Tokens in `src/index.css`**

`@theme` mit den Farb-Tokens aus „Interfaces“ (Namen `--color-surface` usw.), `--font-sans: system-ui, -apple-system, "Segoe UI", sans-serif`, `--font-mono: ui-monospace, "SF Mono", Menlo, monospace`. Werte hell: canvas `#ffffff`, sidebar `#f6f7f9`, surface `#ffffff`, line `#e3e6eb`, fg `#111827`, muted `#5b6472`, accent `#4f46e5`, accent-soft `#eef0ff`, who `#eef0ff`/who-fg `#3730a3`, where `#e8f5ee`/where-fg `#14532d`, not `#fde8e8`/not-fg `#991b1b`, danger `#b91c1c`, danger-soft `#fef2f2`, warn `#92400e`, warn-soft `#fffbeb`, ok `#15803d`. Dunkel unter `@media (prefers-color-scheme: dark)` als Überschreibung der CSS-Variablen (Werte so wählen, dass Text/Bedienelemente AA erreichen, z. B. canvas `#0f1115`, fg `#e5e7eb`, muted `#9aa3b2`, accent `#8b8cf6`). `body`: `font-size: 13px; line-height: 1.45; background: var(--color-canvas); color: var(--color-fg)`. `@media (prefers-reduced-motion: reduce)` setzt Transitionen auf 0.

- [ ] **Step 6: Prüfen und committen**

Run: `npx tsc -b && npx mocha && npx prettier --check . && npm run build` — alles grün.

```bash
git add -A && git commit -m "build: Headless UI, Testing Library und Design-Tokens"
```

---

### Task 2: Reine Hilfsfunktionen

**Files:**
- Create: `src/ui/logic/parseSearch.ts`, `summarizeRight.ts`, `describeProvider.ts`, `findingsAt.ts`, `changedRights.ts`, `viewTarget.ts`
- Modify: `src/ui/conditionTreeOps.ts`
- Test: `test/units/ui/logic/*.spec.ts`, `test/units/ui/conditionTreeOps.spec.ts`

**Interfaces:**
- Consumes: `RightFilter`, `matchesFilter`, `conditionProviders` aus `src/model/rightQueries.ts`; `formatCondition` aus `src/model/formatCondition.ts`; `NodePath` aus `src/ui/conditionTreeOps.ts`.
- Produces:
  - `parseSearch(args: {text: string}): RightFilter`
  - `summarizeRight(args: {policy: PolicyFile; right: RightDef}): string`
  - `describeProvider(args: {provider: ProviderDef}): {sentence: string; short: string}`
  - `findingsAt(args: {findings: readonly Finding[]; prefix: string}): Finding[]`
  - `changedRights(args: {original: string | null; policy: PolicyFile}): Set<number>`
  - `type View = 'channels' | 'overview' | 'providers' | 'rights'`; `interface ViewTarget {field: string | null; index: number | null; view: View}`; `viewTarget(args: {path: string}): ViewTarget | null`
  - `dissolveGroupAt(args: {path: NodePath; root: CompositeNode}): CompositeNode`
  - `wrapInGroupAt(args: {path: NodePath; root: CompositeNode}): CompositeNode`

- [ ] **Step 1: Tests schreiben**

`parseSearch`:
```ts
expect(parseSearch({text: 'rolle:system Channel:APP provider:Vertrag_aktiv sperr'}))
  .to.deep.equal({channel: 'APP', provider: 'Vertrag_aktiv', query: 'sperr', role: 'SYSTEM'})
expect(parseSearch({text: ''})).to.deep.equal({channel: null, provider: null, query: '', role: null})
// Fehlschlag: Schlüssel ohne Wert bleibt Freitext
expect(parseSearch({text: 'rolle: x'})).to.deep.equal({channel: null, provider: null, query: 'rolle: x', role: null})
```
Rollen werden in Großbuchstaben normalisiert; Channel und Provider behalten die Schreibweise; Schlüssel sind case-insensitiv; Freitext ist der Rest, mit einfachen Leerzeichen verbunden.

`summarizeRight` (policy mit 3 Channels):
```ts
expect(summarizeRight({policy, right: {…, channels: ['A','B','C'], roles: ['SYSTEM'], condition: undefined}}))
  .to.equal('1 Rolle · alle Channels · immer')
expect(summarizeRight({policy, right: {…, channels: ['A'], roles: ['SYSTEM','PRODUCT_USER'], condition: {operator:'AND', conditions:['X', {operator:'OR', conditions:['Y','X']}]}}}))
  .to.equal('2 Rollen · 1 Channel · 2 Bedingungen')   // eindeutige Provider-Namen
expect(summarizeRight({policy, right: {…, channels: [], roles: [], condition: {operator:'AND', conditions: []}}}))
  .to.equal('keine Rolle · kein Channel · leere Bedingung')
```

`describeProvider` (Werte aus der produktiven Datei):
```ts
const p = {className: 'ContractStateProvider', name: 'Vertrag_aktiv', negation: false,
  params: [{name: 'ContractStates', values: ['ACTIVE', 'ACTIVE_PLANNED', 'DEACTIVE_PLANNED']}]}
expect(describeProvider({provider: p})).to.deep.equal({
  sentence: 'Trifft zu, wenn ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED',
  short: 'ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED'})
expect(describeProvider({provider: {...p, negation: true}}).sentence)
  .to.equal('Trifft nicht zu, wenn ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED')
expect(describeProvider({provider: {className: 'MNPProvider', name: 'X', negation: false}}))
  .to.deep.equal({sentence: 'Trifft zu laut MNPProvider', short: 'MNPProvider'})
// mehrere Parameter mit „ und “ verbunden; short kürzt jede Werteliste nach 3 Werten mit „, …“
```

`findingsAt`: liefert Befunde, deren `path` gleich dem Präfix ist oder mit `prefix + '.'` bzw. `prefix + '['` beginnt; `rights[1]` trifft **nicht** `rights[12].name`.

`changedRights`:
```ts
expect(changedRights({original: null, policy})).to.deep.equal(new Set())
// unverändert geladen → leer; Beschreibung geändert → {i}; nur verschoben → leer;
// umbenannt → {i}; neu angehängt → {n}; ungültiges original → leer (kein Wurf)
// Fehlschlag: zwei Rechte gleichen Namens im Original; das zweite geändert → genau {1}
```
Zuordnung: Rechte gleichen Namens werden in Reihenfolge ihres Auftretens paarweise zugeordnet (n-tes Vorkommen ↔ n-tes Vorkommen); Vergleich per `JSON.stringify` der beiden `RightDef`.

`viewTarget`:
```ts
expect(viewTarget({path: 'rights[12].condition.conditions[1]'})).to.deep.equal({field: 'condition', index: 12, view: 'rights'})
expect(viewTarget({path: 'providers[3].params[0].values'})).to.deep.equal({field: 'params', index: 3, view: 'providers'})
expect(viewTarget({path: 'channels[2]'})).to.deep.equal({field: null, index: 2, view: 'channels'})
expect(viewTarget({path: 'rights'})).to.deep.equal({field: null, index: null, view: 'rights'})
expect(viewTarget({path: 'foo[1]'})).to.equal(null)
```

`dissolveGroupAt` / `wrapInGroupAt`:
```ts
const root = {operator: 'AND', conditions: [{operator: 'AND', conditions: ['A']}, 'B']}
expect(dissolveGroupAt({path: [0], root})).to.deep.equal({operator: 'AND', conditions: ['A', 'B']})
expect(wrapInGroupAt({path: [1], root})).to.deep.equal(
  {operator: 'AND', conditions: [{operator: 'AND', conditions: ['A']}, {operator: 'AND', conditions: ['B']}]})
// Fehlschlag: dissolveGroupAt auf Wurzel ([]) und auf ein Blatt wirft OperationError
```
`wrapInGroupAt` legt eine neue `AND`-Gruppe um den Knoten; die Eingabe wird nicht verändert (deep-equal-Vergleich mit Kopie vor dem Aufruf).

- [ ] **Step 2: Tests laufen lassen** — Run: `npx mocha` — Expected: FAIL (Module fehlen).

- [ ] **Step 3: Funktionen implementieren** in den genannten Dateien; `summarizeRight` nutzt `conditionProviders` (Anzahl eindeutiger Namen, Singular „Bedingung“, Plural „Bedingungen“; „alle Channels“ nur wenn jeder Policy-Channel enthalten ist und die Policy ≥ 1 Channel hat).

- [ ] **Step 4: Tests laufen lassen** — Run: `npx mocha` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Hilfsfunktionen für Suche, Zusammenfassung und Änderungsmarken"`

---

### Task 3: Bausteine (kit)

**Files:**
- Create: `src/ui/kit/InlineEdit.tsx`, `ConfirmDialog.tsx`, `ActionMenu.tsx`, `ChipSelect.tsx`, `Chip.tsx`, `Toast.tsx`
- Test: `test/components/kit/*.spec.tsx`

**Interfaces:**
- Produces:
  - `InlineEdit(props: {ariaLabel: string; error?: string | null; mono?: boolean; multiline?: false; onCommit: (value: string) => void; placeholder?: string; size?: 'lg' | 'md'; value: string})` — Anzeige als Button-ähnlicher Text; Klick/Enter öffnet `<input>`; Enter und Blur rufen `onCommit` (nur bei geändertem Wert), Escape verwirft; `error` wird unter dem Feld mit `aria-describedby` angezeigt und lässt das Feld im Bearbeitungsmodus.
  - `ConfirmDialog(props: {confirmLabel: string; danger?: boolean; children: React.ReactNode; onCancel: () => void; onConfirm: () => void; open: boolean; title: string})` — Headless UI `Dialog`; Fokus beim Öffnen auf „Abbrechen“.
  - `ActionMenu(props: {items: readonly {danger?: boolean; disabled?: boolean; label: string; onSelect: () => void}[]; label: string})` — Headless UI `Menu`, Auslöser „⋯“ mit `aria-label={label}`.
  - `ChipSelect(props: {label: string; onChange: (next: string[]) => void; options: readonly string[]; searchable?: boolean; selected: readonly string[]; showAllNone?: boolean})` — Headless UI `Popover` mit Checkliste; neue Werte werden hinten angefügt, Abwahl entfernt; „alle“ setzt `[...options]`, „keine“ `[]`.
  - `Chip(props: {children: React.ReactNode; onRemove?: () => void; removeLabel?: string; tone: 'danger' | 'neutral' | 'where' | 'who'})`
  - `Toast(props: {message: string | null; onDone: () => void})` — `role="status"`, verschwindet nach 3 s.

- [ ] **Step 1: Komponententests schreiben** (Testing Library + `userEvent.setup()`):
  - InlineEdit: `Erfolg: Enter übernimmt`, `Erfolg: Blur übernimmt`, `Fehlschlag: Escape verwirft und ruft onCommit nicht`, `Fehlschlag: unveränderter Wert ruft onCommit nicht`, `Fehlschlag: error bleibt sichtbar und Feld bleibt offen`.
  - ConfirmDialog: `Erfolg: Bestätigen ruft onConfirm`, `Fehlschlag: Escape ruft onCancel`, `Erfolg: Fokus liegt beim Öffnen auf „Abbrechen“`, `Erfolg: nach Schließen liegt der Fokus wieder auf dem Auslöser` (Testaufbau mit Auslöse-Button, der `open` setzt).
  - ActionMenu: `Erfolg: Eintrag per Tastatur (Enter, Pfeil, Enter) auswählen`, `Fehlschlag: deaktivierter Eintrag ruft nichts`.
  - ChipSelect: `Erfolg: Häkchen fügt hinten an`, `Erfolg: „alle“/„keine“`, `Erfolg: Suche filtert die Liste`, `Fehlschlag: Escape schließt ohne Änderung`.

- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.

- [ ] **Step 3: Komponenten implementieren** mit den Tokens aus Task 1 (Fokusring `outline-2 outline-accent`, Klickflächen ≥ 24 px; Chip-Töne: who → `bg-who text-who-fg`, where → `bg-where text-where-fg`, danger → `bg-danger-soft text-danger`, neutral → `bg-sidebar text-fg`). Lange Texte brechen um (`break-words`).

- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: Bausteine für Inline-Bearbeitung, Dialoge, Menüs und Chip-Auswahl"`

---

### Task 4: Shell, Startbildschirm, Prüf-Panel, Diff

**Files:**
- Create: `src/ui/shell/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `StartScreen.tsx`, `FindingsDrawer.tsx`, `DiffDialog.tsx`
- Modify: `src/App.tsx`
- Test: `test/components/shell/*.spec.tsx`

**Interfaces:**
- Consumes: `useEditor`, `EditorAction` (unverändert), `viewTarget`/`View` (Task 2), `changedRights` (Task 2), `ConfirmDialog`, `Toast` (Task 3), `buildDiffRows`/`isUnchanged` aus `src/ui/diffRows.ts`, `loadSucceeds`, `downloadText`, `serializePolicy`.
- Produces:
  - `AppShell(props: {children: React.ReactNode; drawer: React.ReactNode | null; sidebar: React.ReactNode; topBar: React.ReactNode})`
  - `Sidebar(props: {changedCount: number; counts: {channels: number; providers: number; rights: number}; errorCount: number; onOpenChanges: () => void; onOpenFindings: () => void; onSelect: (view: View) => void; view: View; warningCount: number})` — Navigation als `<nav aria-label="Bereiche">`, aktive Ansicht mit `aria-current="page"`; Status „✓ Datei gültig“ bei 0 Fehlern und 0 Warnungen, sonst „n Fehler · m Warnungen“.
  - `TopBar(props: {canRedo: boolean; canUndo: boolean; fileLabel: string; onDownload: () => void; onRedo: () => void; onReload: () => void; onUndo: () => void})`
  - `StartScreen(props: {error: string | null; hasAutosave: boolean; onCancel: (() => void) | null; onClearError: () => void; onLoad: (text: string) => void; onNew: () => void; onResume: (() => void) | null})` — übernimmt Laden per Datei/Drag & Drop/Einfügen aus dem alten `LoadScreen`.
  - `FindingsDrawer(props: {findings: Finding[]; loadNotes: Finding[]; onClose: () => void; onSelect: (path: string) => void; open: boolean; showUnknownFieldHint: boolean})` — Headless UI `Dialog` als Seitenpanel rechts.
  - App-Zustand: `view: View`, `selection: {field: string | null; index: number | null} | null`; `select(path)` nutzt `viewTarget`.
- `AppShell` zeigt `state.error` als schließbare Meldung (`role="alert"`, schließen → `dispatch({type: 'clearError'})`).
- `window.confirm` in `App.tsx` wird durch `ConfirmDialog` ersetzt (Verwerfen ungespeicherter Änderungen, Download trotz Fehlern — Text „Die Datei enthält Fehler, die den Start des policy-service verhindern. Trotzdem herunterladen?“ bleibt).
- Bis Task 6/7 rendert `App` in der Shell die alten Tabs (`ChannelsTab`, `ProvidersTab`, `RightsTab`, `MatrixTab`) je nach `view`.

- [ ] **Step 1: Komponententests schreiben**
  - AppShell: `Erfolg: state.error erscheint als Alert und lässt sich schließen`.
  - Sidebar: `Erfolg: aktive Ansicht hat aria-current`, `Erfolg: zeigt „✓ Datei gültig“ ohne Befunde`, `Fehlschlag: zeigt „2 Fehler · 1 Warnung“` (Singular/Plural), `Erfolg: Klick auf Status ruft onOpenFindings`.
  - StartScreen: `Erfolg: „Letzten Stand fortsetzen“ nur mit onResume`, `Fehlschlag: error wird angezeigt`.
  - FindingsDrawer: `Erfolg: Klick auf Befund ruft onSelect mit Pfad`.

- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.

- [ ] **Step 3: Implementieren**; Download zeigt danach `Toast` „policy.json heruntergeladen“. „Letzten Stand fortsetzen“ erscheint, wenn `state.policy !== null` und der Startbildschirm über „Neu laden“ geöffnet wurde (entspricht dem bisherigen `onCancel`). Grid-Layout der Shell: Seitenleiste 200 px fest, Hauptbereich `minmax(0,1fr)`; unter 1024 px stapelt sich die Seitenleiste oben.

- [ ] **Step 4: Tests + Browser-Kurzprüfung** — `npx mocha` PASS; `npm run dev`, produktive `test/fixtures/policy-prod.json` laden, alle vier Bereiche erreichbar, Download-Dialog bei Fehlern erscheint.

- [ ] **Step 5: Commit** — `git commit -m "feat: neue App-Shell mit Seitenleiste, Startbildschirm und Prüf-Panel"`

---

### Task 5: Block-Editor für Bedingungen

**Files:**
- Create: `src/ui/condition/ConditionBuilder.tsx`, `ConditionGroupBlock.tsx`, `ProviderRow.tsx`, `ProviderPicker.tsx`
- Test: `test/components/condition/*.spec.tsx`

**Interfaces:**
- Consumes: `insertChildAt`, `moveChildWithin`, `removeNodeAt`, `setOperatorAt`, `updateNodeAt`, `dissolveGroupAt`, `wrapInGroupAt` (`src/ui/conditionTreeOps.ts`); `describeProvider` (Task 2); `ActionMenu` (Task 3); `formatCondition`.
- Produces:
  - `ConditionBuilder(props: {findings: Finding[]; onChange: (next: CompositeNode | undefined) => void; providers: readonly ProviderDef[]; value: CompositeNode | undefined})` — `undefined` zeigt „Gilt immer“ mit Knopf „+ Bedingung“ (setzt `{operator: 'AND', conditions: []}`); sonst Wurzelgruppe, darunter die Formel (`formatCondition`) als lesende Zeile und ein Knopf „Bedingung entfernen (gilt immer)“, der `onChange(undefined)` aufruft. `findings` sind die Befunde des Rechts unter `…condition`; Befunde, deren Pfad genau einem Knoten entspricht, erscheinen an dessen Zeile.
  - `ProviderPicker(props: {label: string; onPick: (name: string) => void; providers: readonly ProviderDef[]})` — Headless UI `Combobox`; Filter über Name **und** Beschreibung (case-insensitiv); Option zeigt Name (mono) und Beschreibung.
- Texte: Segmentschalter „Alle“ (`AND`) / „Mindestens eine“ (`OR`), dahinter „der folgenden treffen zu“; Negations-Kennzeichen „NICHT“; leere Gruppe: „Leere Gruppe – Provider oder Gruppe hinzufügen“; unbekannter Provider: Zeile mit Ton danger und Text „Unbekannter Provider“; ungültiger Operator: Hinweis „Ungültiger Operator „XOR“ – Alle oder Mindestens eine wählen“ (keiner der beiden Segmente aktiv).
- Zeilen-Menü (Provider): „Nach oben“, „Nach unten“, „In Gruppe fassen“, „Entfernen“. Gruppen-Menü: „Nach oben“, „Nach unten“, „Gruppe auflösen“, „Entfernen“; an der Wurzel nur „Gruppe auflösen“ nicht angeboten.
- Gruppen als getönte Fläche (`bg-sidebar`), Provider-Zeilen als `bg-surface` mit Linie; keine weiteren Rahmen-Ebenen.

- [ ] **Step 1: Komponententests schreiben** (mit den Provider-Daten `Vertrag_aktiv`, `Kein_Prepaidvertrag` „Wird nicht per Prepaid bezahlt“ `negation: true`, `Prepaidvertrag` „Wird per Prepaid bezahlt“):
  - `Erfolg: Umschalten auf „Mindestens eine“ setzt operator OR an der Wurzel`
  - `Erfolg: Suche „prepaid“ findet beide Prepaid-Provider über die Beschreibung; Auswahl fügt „Kein_Prepaidvertrag“ hinten an`
  - `Erfolg: „+ Gruppe“ fügt {operator:'AND', conditions:[]} an`
  - `Erfolg: „Gruppe auflösen“ an [0] ersetzt die Gruppe durch ihre Kinder`
  - `Erfolg: verschachtelte Gruppe auf Tiefe 3 wird gerendert und ist bearbeitbar`
  - `Erfolg: NICHT-Kennzeichen erscheint bei negation true`
  - `Fehlschlag: unbekannter Provider wird als Fehlerzeile angezeigt und lässt sich entfernen`
  - `Fehlschlag: Operator „XOR“ zeigt Hinweis, Klick auf „Alle“ setzt AND`
  - `Fehlschlag: leere Gruppe zeigt Hinweis statt leerer Fläche`
  - `Erfolg: „+ Bedingung“ bei undefined, „Bedingung entfernen“ liefert undefined`

- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Implementieren.** Schlüssel der Kindknoten: Index (Knoten sind keine eindeutigen Strings).
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Block-Editor für Bedingungen mit Provider-Suche"`

---

### Task 6: Rechte-Ansicht

**Files:**
- Create: `src/ui/rights/RightsView.tsx`, `RightList.tsx`, `RightInspector.tsx`
- Modify: `src/App.tsx` (Rechte-Ansicht statt `RightsTab`)
- Test: `test/components/rights/*.spec.tsx`

**Interfaces:**
- Consumes: `parseSearch`, `summarizeRight`, `changedRights`, `findingsAt` (Task 2); `matchesFilter` (`src/model/rightQueries.ts`); `InlineEdit`, `ChipSelect`, `Chip`, `ActionMenu`, `ConfirmDialog` (Task 3); `ConditionBuilder` (Task 5); `upsertRight`, `deleteRight`, `moveRight`; `uniqueName`; `USER_ROLES`.
- Produces: `RightsView(props: {changed: Set<number>; dispatch: (a: EditorAction) => void; findings: Finding[]; policy: PolicyFile; selection: {field: string | null; index: number | null} | null})`.
- Liste: Kopf mit Titel „Rechte“, Suchfeld (`aria-label="Rechte suchen"`, Platzhalter „Suchen · rolle: channel: provider:“), Filter-Menü (Rolle/Channel/Provider als `ChipSelect`-ähnliche Auswahl mit genau einem Wert), Chips der aktiven Filter (entfernbar), „+ Neues Recht“. Einträge: `#ID Name` (mono), `summarizeRight`, Punkt „geändert“ (`aria-label="geändert"`), Fehlermarke (`aria-label="hat Fehler"`). Leer: „Noch keine Rechte.“ + „Erstes Recht anlegen“; keine Treffer: „Keine Treffer.“ + „Filter zurücksetzen“. Zähler „n von m“ als `aria-live="polite"`.
- Inspektor: Kopf `InlineEdit` Name (size lg, mono) und Beschreibung; „ID n“; `ActionMenu` mit „Position ändern…“ und „Löschen…“. Zeilen Wer / Wo / Wann (Beschriftungen klein, Großbuchstaben). Wer: Chips (who) + `ChipSelect` „+ Rolle“ über `USER_ROLES`; unbekannte Rollen als danger-Chips mit Entfernen. Wo: Chips (where), ab 7 Einträgen erste 6 + „+ n weitere“ (aufklappbar), `ChipSelect` mit Suche und „alle“/„keine“; unbekannte Channels danger. Wann: `ConditionBuilder`. Hinweise bei leeren Listen: „Mindestens eine Rolle wählen“, „Mindestens einen Channel wählen“. Befunde des Rechts (`findingsAt` mit `rights[i]`) am jeweiligen Feld (`name`, `description`, `roles`, `channels`, `condition`).
- Neues Recht: `uniqueName({base: 'NeuesRecht', …})`, anhängen, auswählen, Namensfeld im Bearbeitungsmodus fokussiert.
- „Position ändern…“: `ConfirmDialog` mit Zahlenfeld „Neue ID“ (1 … n) und Satz „Die IDs von k Rechten verschieben sich.“ (k = |alt − neu|); Bestätigen → `moveRight`, Auswahl folgt dem Recht.
- „Löschen…“: `ConfirmDialog` danger, Text „Recht X löschen? Die IDs von k folgenden Rechten verschieben sich.“ (k = n − i − 1); danach Auswahl leer.
- Beschreibungseingabe sendet `coalesce: 'right-<i>-description'`.
- Auswahl außerhalb von `policy.rights` (nach Undo/Löschen) → Inspektor zeigt „Recht aus der Liste wählen oder ein neues anlegen.“

- [ ] **Step 1: Komponententests schreiben** (Policy aus `test/fixtures/policy-prod.json`, über `parsePolicy`, mit echtem `editorReducer` via kleinem Test-Wrapper, der `useReducer` nutzt):
  - `Erfolg: Suche „rolle:SYSTEM channel:APP“ filtert die Liste und zeigt zwei Filter-Chips`
  - `Erfolg: Entfernen eines Filter-Chips hebt den Filter auf`
  - `Erfolg: „+ Neues Recht“ hängt NeuesRecht an und öffnet den Namen im Bearbeitungsmodus`
  - `Erfolg: Rolle über „+ Rolle“ hinzufügen und per Chip entfernen`
  - `Erfolg: „Löschen…“ nach Bestätigung entfernt das Recht; Inspektor zeigt Leerzustand`
  - `Erfolg: „Position ändern…“ auf ID 1 verschiebt und behält die Auswahl auf dem Recht`
  - `Fehlschlag: Umbenennen auf einen vorhandenen Namen zeigt die Fehlermeldung am Feld, der Name bleibt`
  - `Fehlschlag: Auswahl auf gelöschtem Index (selection.index = rights.length) zeigt den Leerzustand`
  - `Fehlschlag: unbekannte Rolle „FOO“ und unbekannter Channel „BAR“ erscheinen als Fehler-Chips und lassen sich entfernen`
  - `Fehlschlag: zwei Rechte gleichen Namens erzeugen keine React-Key-Warnung` (Sinon-Spy auf `console.error`, darf nicht mit „same key“ aufgerufen werden)
  - `Erfolg: 80-Zeichen-Name ohne Leerzeichen hat break-words/min-w-0 im Listeneintrag und in der Überschrift` (Klassen-Assertion)

- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Implementieren**; Layout: Liste `minmax(14rem,18rem)`, Inspektor `minmax(0,1fr)`, Liste ab 1024 px `sticky` mit eigenem Scroll.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS. Browser: produktive Datei, #4 SimkarteSperren öffnen, Bedingung bearbeiten, Rückgängig.
- [ ] **Step 5: Commit** — `git commit -m "feat: Rechte-Ansicht als Inspektor „Wer · Wo · Wann“"`

---

### Task 7: Provider, Channels, Übersicht

**Files:**
- Create: `src/ui/providers/ProvidersView.tsx`, `ProviderInspector.tsx`, `src/ui/channels/ChannelsView.tsx`, `src/ui/overview/OverviewView.tsx`
- Modify: `src/App.tsx`, `src/ui/ParamEditor.tsx`, `src/ui/ParamRow.tsx` (nur Stil auf Tokens/Chips umstellen, Verhalten unverändert)
- Test: `test/components/providers/*.spec.tsx`, `test/components/channels/*.spec.tsx`

**Interfaces:**
- Consumes: `describeProvider`, `findingsAt` (Task 2); Kit (Task 3); `upsertProvider`, `renameProviderAt`, `deleteProvider`, `findProviderUsages`, `addChannel`, `renameChannel`, `deleteChannel`, `findChannelUsages`; `paramNameSuggestions`; `rightsFor`, `formatCondition`; `PROVIDER_CLASSES`.
- Produces:
  - `ProvidersView(props: {dispatch; findings: Finding[]; onOpenRight: (index: number) => void; policy: PolicyFile; selection: {field: string | null; index: number | null} | null})`
  - `ChannelsView(props: {dispatch; findings: Finding[]; onOpenRight: (index: number) => void; policy: PolicyFile; selection: … | null})`
  - `OverviewView(props: {onOpenRight: (index: number) => void; policy: PolicyFile})` — Verhalten wie `MatrixTab`, im neuen Stil.
- Provider-Liste: Suche über Name und Beschreibung, Eintrag Name (mono) + Beschreibung + „n Rechte“; „+ Neuer Provider“ (Name `uniqueName({base: 'NeuerProvider', …})`, Klasse erste aus `PROVIDER_CLASSES`, `negation: false`).
- Provider-Inspektor: `describeProvider(...).sentence` als Satz oben; Name (`InlineEdit`, `renameProviderAt`), Klasse (`<select>`), Beschreibung (`InlineEdit`, leer = Schlüssel weglassen, `coalesce: 'provider-<i>-description'`), Negation als Schalter (`role="switch"`), Parameter über `ParamEditor`; „Verwendet von“ als Liste klickbarer Rechte (`onOpenRight`); `ActionMenu` „Löschen…“ deaktiviert mit Begründung „Wird noch von n Rechten verwendet“, sonst `ConfirmDialog`.
- Channels: Eingabe „Channel hinzufügen“ + Knopf; Zeilen mit `InlineEdit` (umbenennen), Zähler „n Rechte“ (klickbar → Liste der Rechte aufklappen), Löschen-Knopf deaktiviert mit `title`/Text „Gesperrt: noch in n Rechten verwendet“. Leer: „Noch keine Channels.“

- [ ] **Step 1: Komponententests schreiben**
  - Provider: `Erfolg: Satz „Trifft nicht zu, wenn …“ bei Negation`, `Erfolg: Umbenennen zieht Referenzen in Bedingungen nach` (Prüfung am Reducer-Zustand), `Fehlschlag: Löschen ist bei Verwendung deaktiviert und nennt die Zahl`, `Erfolg: Klick auf nutzendes Recht ruft onOpenRight(index)`.
  - Channels: `Erfolg: hinzufügen`, `Erfolg: umbenennen zieht Referenzen nach`, `Fehlschlag: doppelter Channel-Name zeigt Fehler am Feld`, `Fehlschlag: Löschen gesperrt solange genutzt`.
- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Provider-, Channel- und Übersichtsansicht im neuen Design"`

---

### Task 8: Tastatur, Aufräumen, Abschluss-Prüfung

**Files:**
- Create: `src/ui/useShortcuts.ts`, `test/components/shortcuts.spec.tsx`, `docs/superpowers/evidence/ui-redesign/report.json` (+ Screenshots)
- Modify: `src/App.tsx`, `README.md`, `src/ui/undoShortcut.ts` (falls nötig erweitert)
- Delete: alle unter „Entfallen am Ende“ gelisteten Dateien samt nicht mehr benötigter Tests (`test/units/ui/pathTarget.spec.ts`)

**Interfaces:**
- Consumes: `undoShortcut` (bestehend), `dispatch`.
- Produces: `useShortcuts(args: {dispatch: (a: EditorAction) => void; enabled: boolean; onFocusSearch: () => void; onMoveSelection: (delta: -1 | 1) => void})`.
- `/` fokussiert die Suche der aktuellen Ansicht, ↑/↓ verschieben die Auswahl in Rechte-/Provider-Liste, wenn der Fokus in der Liste liegt; keines der Kürzel greift in Textfeldern (gleiche Erkennung wie `undoShortcut`) oder bei offenem Dialog.

- [ ] **Step 1: Tests schreiben** — `Erfolg: „/“ ruft onFocusSearch`, `Fehlschlag: „/“ im Textfeld tippt ein Zeichen und ruft nichts`, `Erfolg: Pfeil runter in der Liste ruft onMoveSelection(1)`, `Fehlschlag: bei offenem ConfirmDialog greift kein Kürzel`.
- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Implementieren und alte Dateien löschen**; `rg "styles.ts|TabBar|RightForm|ConditionTree|Selection.ts|pathTarget" src test` liefert 0 Treffer.
- [ ] **Step 4: Gesamtprüfung** — `npx tsc -b && npx mocha && npx prettier --check . && npm run build && npm audit` — alles grün, 0 vulnerabilities.
- [ ] **Step 5: README** — Abschnitt „Funktionen“ an die neue Bedienung anpassen (Inspektor, Block-Editor, Suche mit `rolle:`/`channel:`/`provider:`, Tastenkürzel `/`, ↑/↓, Undo/Redo, Dunkelmodus); neue Pakete unter „Tests und Qualität“ nennen.
- [ ] **Step 6: Abschluss-Prüfung nach ECC `frontend-design-direction`** im Browser mit `test/fixtures/policy-prod.json`: Screenshots 1440×900 und 1024×768 jeweils hell und dunkel (Rechte-Inspektor #4 SimkarteSperren, Provider-Inspektor `Vertrag_aktiv`, Startbildschirm, Prüf-Panel mit einem erzeugten Fehler, Löschen-Dialog); Tastatur-Durchgang (Recht anlegen, Rolle/Channel wählen, Provider per Suche hinzufügen, Gruppe auflösen, Download) ohne Maus; Kontrast stichprobenartig gemessen; `prefers-reduced-motion`; 80-Zeichen-Name. Ergebnisse in `docs/superpowers/evidence/ui-redesign/report.json` (Felder laut Skill: `contract`, `targetViewports: ["1440x900", "1024x768"]`, `accessibility`, `responsive`, `contentStates` mit `loading`/`permission` als `not-applicable` + Begründung, `renderedEvidence`), dann `node ~/.claude/skills/frontend-design-direction/scripts/check-evidence.js docs/superpowers/evidence/ui-redesign/report.json` — Expected: bestanden. Gefundene Mängel beheben und betroffene Prüfungen wiederholen.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: Tastenkürzel, Aufräumen und Abschluss-Prüfung des neuen Designs"`
