# policy-editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local, static React app that loads, edits, validates and downloads the `policy.json` of `policy-service`.

**Architecture:** A React-free model layer (`src/model/`: types, parse, serialize, validate, operations) carries all logic and is unit-tested; a `useReducer` store calls only `operations.ts`; the UI (`src/ui/`) renders tabs, forms, a condition tree builder, a validation panel and a diff/download view.

**Tech Stack:** React 19, TypeScript strict, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Mocha + Chai + Sinon via `tsx`, c8 coverage, `diff` (jsdiff) for the line diff, Prettier.

**Spec:** `docs/superpowers/specs/2026-11-11-policy-editor-design.md`

## Global Constraints

- **Local only:** no git remote is added, nothing is pushed, no deploy, no network calls from the app at runtime. `npm install` from the public npm registry is the only network use.
- Every dependency version must be at least 3 days old: install with `npm install --before=2026-11-08` and pin exact versions (no `^`/`~`) in `package.json`.
- TypeScript strict; no `enum` (union types), no `any`, no `#private`, explicit return types, `args`-object parameters for model functions (team rules `AGENTS-typescript.md`).
- No team ESLint config (it lives in a private GitHub package); quality gates are `tsc --noEmit`, `prettier --check`, `npm test`.
- Tests: Mocha/Chai/Sinon, files `test/units/**/*.spec.ts` mirroring `src/`, German descriptions starting with `Erfolg:` or `Fehlschlag:`; `sinon.restore()` in `afterEach`.
- Validation messages are copied verbatim (German) from `policy-service` `DatabaseService.java`.
- Roles: `PRODUCT_OWNER`, `PRODUCT_USER`, `INTERESTED_PERSON`, `ACCOUNT_ADMIN`, `SYSTEM`.
- Provider classes (19): ContractAssociationProvider, ContractBarringTypeProvider, ContractOptionProvider, ContractStateProvider, ContractTypeProvider, CustomerTypeProvider, DunningLevelProvider, MNPProvider, MarkProvider, MarketingPermitProvider, MultiSimProvider, NetworkProvider, OpenItemProvider, PaymentTypeProvider, PersonTypeProvider, RecommenderProvider, SimOrderProvider, TariffReferenceProvider, VvlProvider.
- UI text in German; `localStorage` access always inside `try/catch`.
- Commit after every task with a Conventional-Commit message (types: feat, fix, chore, test, refactor, build).

## Review Focus

1. **Byte-identical round trip of the real files** — escaped quotes (`\"`), umlauts, empty `params: []`, mixed-type param values, trailing newline. Pinned in Task 3 by both fixture tests.
2. **Renaming a provider/channel to a name that already exists** — must be rejected, not merge two entities. Pinned in Task 5 (`Fehlschlag: lehnt Umbenennung auf vorhandenen Namen ab`).
3. **Loading a file that parses as JSON but has the wrong shape** (e.g. `rights` is an object, `negation` is `"false"`) — must load as far as possible and report findings, never crash the UI. Pinned in Task 2.
4. **Deeply nested conditions** — rename must update references at every depth; validation paths must point to the right node. Pinned in Tasks 4 and 5 with a 3-level fixture.
5. **Stale autosave from a corrupted/older localStorage entry** — must be ignored, app starts empty. Pinned in Task 6.

---

### Task 1: Project scaffold and fixtures

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.prettierrc.json`, `.gitignore`, `.mocharc.json`
- Create: `test/fixtures/policy-prod.json`, `test/fixtures/policy-test.json` (byte copies)
- Create: `test/units/smoke.spec.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`mocha`), `coverage` (`c8 --include=src/model mocha`), `format` / `check-format` (prettier).

- [ ] **Step 1:** Scaffold with Vite's `react-ts` template into the existing repo (keep `docs/`), add `tailwindcss` + `@tailwindcss/vite`, `mocha`, `chai`, `sinon`, `tsx`, `c8`, `prettier`, `diff` and their `@types/*`, all via `npm install --before=2026-11-08 --save-exact`. `src/index.css` contains `@import "tailwindcss";`. `.mocharc.json`: `{"node-option": ["import=tsx"], "spec": "test/units/**/*.spec.ts"}`. Prettier: `{"semi": false, "singleQuote": true, "bracketSpacing": false, "printWidth": 120}`; `.prettierignore` contains `test/fixtures/`. `.gitignore` adds `node_modules/`, `dist/`, `coverage/`.
- [ ] **Step 2:** Copy fixtures byte-for-byte:
  `cp ~/dev/policy-service/policy-service-json-rewrite/src/main/resources/policy-config/policy.json test/fixtures/policy-prod.json` and the same for `src/test/resources/policy-config-test/policy.json` → `test/fixtures/policy-test.json`.
- [ ] **Step 3:** Write `test/units/smoke.spec.ts` with `it('Erfolg: Testumgebung läuft', () => expect(1 + 1).to.equal(2))`.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build` — all pass; `npm audit` shows 0 vulnerabilities; `git remote -v` prints nothing.
- [ ] **Step 5:** Commit `build: Projektgerüst mit Vite, React, Tailwind und Mocha`.

### Task 2: Model types, constants and parser

**Files:**
- Create: `src/model/PolicyTypes.ts`, `src/constants.ts`, `src/model/parse.ts`
- Test: `test/units/model/parse.spec.ts`

**Interfaces:**
- Produces:
```ts
export type Scalar = boolean | number | string
export interface ParamDef {name: string; values: Scalar[]}
export interface ProviderDef {className: string; description?: string; name: string; negation?: boolean; params?: ParamDef[]}
export type Operator = 'AND' | 'OR'
export type ConditionNode = CompositeNode | string
export interface CompositeNode {conditions: ConditionNode[]; operator: string}
export interface RightDef {channels: string[]; condition?: CompositeNode; description: string; name: string; roles: string[]}
export interface PolicyFile {channels: string[]; providers: ProviderDef[]; rights: RightDef[]}
export interface Finding {message: string; path: string; severity: 'error' | 'warning'}
export type ParseResult = {error: string; ok: false} | {findings: Finding[]; ok: true; policy: PolicyFile}
export function parsePolicy(args: {text: string}): ParseResult
export const USER_ROLES: readonly string[]; export const PROVIDER_CLASSES: readonly string[]
export function emptyPolicy(): PolicyFile  // {channels: [], providers: [], rights: []}
```
`operator` stays `string` in the model so an invalid operator survives loading and is reported by `validate`. Paths use the form `rights[3].condition.conditions[1]`.

- [ ] **Step 1: Write failing tests** in `parse.spec.ts`:
  - `Erfolg: liest die produktive policy.json` → `ok === true`, 11 channels, 48 providers, 49 rights, `findings` empty.
  - `Fehlschlag: meldet ungültiges JSON` → `ok === false`, `error` contains `JSON`.
  - `Fehlschlag: meldet unbekanntes Feld` for `{"channels":[],"providers":[],"rights":[],"extra":1}` → finding `{severity:'error', path:'extra', message:'Unbekanntes Feld: extra'}`.
  - `Fehlschlag: lädt falsche Typen so weit wie möglich` for `rights` as object and a provider with `"negation": "false"` → `ok === true`, `rights` is `[]`, provider has `negation === undefined`, findings with paths `rights` and `providers[0].negation`, message prefix `Falscher Typ`.
  - `Erfolg: Bedingung mit Strings und verschachtelten Gruppen` keeps a 3-level tree unchanged.
- [ ] **Step 2:** Run `npx mocha test/units/model/parse.spec.ts` — FAIL (module not found).
- [ ] **Step 3:** Implement. `parsePolicy` catches `JSON.parse` errors → `{ok:false, error: 'Ungültiges JSON: ' + e.message}`; a non-object root is also `ok:false`. Each known field is read with a small type guard; wrong type → finding `Falscher Typ für <path>: erwartet <type>` and the field falls back (`[]` for lists, `''` for required strings, `undefined` for optional fields and `negation`). Unknown keys at every level → `Unbekanntes Feld: <path>`.
- [ ] **Step 4:** Run the spec — PASS. `npm run typecheck` — PASS.
- [ ] **Step 5:** Commit `feat: Modell und Parser für policy.json`.

### Task 3: Serializer with byte-identical round trip

**Files:**
- Create: `src/model/serialize.ts`
- Test: `test/units/model/serialize.spec.ts`

**Interfaces:**
- Consumes: `PolicyFile`, `parsePolicy`.
- Produces: `export function serializePolicy(args: {policy: PolicyFile}): string`

Layout rules (decided here, verified by the fixtures):
- 2-space indent, `": "` separator, `,` + newline between multi-line items, exactly one `\n` at end of file. Strings via `JSON.stringify` (keeps umlauts, escapes `"`).
- Root object, every `providers[i]`, every `rights[i]`, and the `providers`/`rights`/`params` arrays are multi-line (an empty array prints `[]`).
- Arrays of scalars and param objects print inline: `["A", "B"]`, `{"name": "X", "values": [1]}`.
- A condition object prints inline if all its `conditions` are strings; otherwise multi-line with `"operator"` and `"conditions": [` on separate lines and each child on its own line (child inline when it qualifies).
- Key order: root `channels, providers, rights`; provider `name, className, description, negation, params`; param `name, values`; right `name, description, roles, channels, condition`; condition `operator, conditions`. Undefined optional fields are omitted.

- [ ] **Step 1: Write failing tests:**
  - `Erfolg: produktive Datei bleibt byte-identisch` → `serializePolicy(parse(prod)) === readFileSync(prod)`.
  - `Erfolg: Test-Datei bleibt byte-identisch` → same for `policy-test.json`.
  - `Erfolg: Recht ohne Bedingung lässt condition weg`.
  - `Erfolg: leere Konfiguration` → `'{\n  "channels": [],\n  "providers": [],\n  "rights": []\n}\n'`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `serializePolicy` per the rules above. If a fixture still differs, print the first differing line in the test failure and adjust the rule — the fixtures are the authority.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat: Serialisierung im bestehenden Dateistil`.

### Task 4: Validation

**Files:**
- Create: `src/model/validate.ts`
- Test: `test/units/model/validate.spec.ts`

**Interfaces:**
- Consumes: `PolicyFile`, `Finding`, `USER_ROLES`, `PROVIDER_CLASSES`.
- Produces: `export function validatePolicy(args: {policy: PolicyFile}): Finding[]` (errors and warnings, in file order).

Messages (verbatim from `DatabaseService.java`; `<x>` substituted):

| Rule | Message | Path |
| --- | --- | --- |
| providers empty | `Pflichtfeld fehlt oder ist leer: providers` | `providers` |
| rights empty | `Pflichtfeld fehlt oder ist leer: rights` | `rights` |
| channels empty / blank entry | `Pflichtfeld fehlt oder ist leer: channels` | `channels` / `channels[i]` |
| duplicate channel | `Doppelter Eintrag in channels: <v>` | `channels[i]` |
| provider name blank | `Pflichtfeld fehlt oder ist leer: name eines Providers` | `providers[i].name` |
| duplicate provider | `Doppelter Provider-Name: <name>` | `providers[i].name` |
| className blank | `Pflichtfeld fehlt oder ist leer: className von Provider <name>` | `providers[i].className` |
| unsupported class | `Unbekannte Provider-Klasse: <className>` | `providers[i].className` |
| negation missing | `Pflichtfeld fehlt: negation von Provider <name>` | `providers[i].negation` |
| param name blank | `Pflichtfeld fehlt oder ist leer: Parametername von Provider <name>` | `providers[i].params[j].name` |
| duplicate param | `Doppelter Parameter: <provider>.<param>` | `providers[i].params[j].name` |
| non-integer number | `Parameterwert muss eine Ganzzahl im Long-Bereich sein: <provider>.<param>` | `providers[i].params[j].values[k]` |
| empty values (warning) | `Parameter <provider>.<param> hat keine Werte` | `providers[i].params[j].values` |
| mixed value types (warning) | `Parameter <provider>.<param> mischt Wertetypen` | `providers[i].params[j].values` |
| right name blank | `Pflichtfeld fehlt oder ist leer: name eines Rechts` | `rights[i].name` |
| duplicate right | `Doppelter Rechte-Name: <name>` | `rights[i].name` |
| description blank | `Pflichtfeld fehlt oder ist leer: description von Recht <name>` | `rights[i].description` |
| roles empty / duplicate | `Pflichtfeld fehlt oder ist leer: roles von Recht <name>` / `Doppelter Eintrag in roles von Recht <name>: <v>` | `rights[i].roles` / `rights[i].roles[k]` |
| unknown role | `Unbekannte Rolle in Recht <name>: <v>` | `rights[i].roles[k]` |
| channels empty / duplicate | same pattern with `channels von Recht <name>` | `rights[i].channels…` |
| unknown channel | `Unbekannter Channel in Recht <name>: <v>` | `rights[i].channels[k]` |
| invalid operator | `Ungültiger operator in Recht <name>: <op>` | `….operator` |
| empty conditions | `Pflichtfeld fehlt oder ist leer: conditions in Recht <name>` | `….conditions` |
| unknown provider ref | `Unbekannter Provider in Bedingung von Recht <name>: <ref>` | `….conditions[k]` |

"Long range" means `Number.isSafeInteger(v)` (JS cannot represent the full Long range exactly; document this in a comment).

- [ ] **Step 1: Write failing tests:** `Erfolg: produktive und Test-Datei sind fehlerfrei` (both fixtures → no `error` findings); then one `Fehlschlag:` test per table row asserting `{severity, path, message}` exactly, built by mutating a small valid base policy; plus `Fehlschlag: meldet unbekannten Provider in dritter Verschachtelungsebene` with path `rights[0].condition.conditions[1].conditions[0].conditions[0]`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `validatePolicy`; walk conditions recursively, building paths.
- [ ] **Step 4:** Run — PASS; `npm run coverage` shows ≥80 % branches for `src/model/validate.ts`.
- [ ] **Step 5:** Commit `feat: Validierung nach den Startregeln des policy-service`.

### Task 5: Operations

**Files:**
- Create: `src/model/operations.ts`
- Test: `test/units/model/operations.spec.ts`

**Interfaces:**
- Consumes: `PolicyFile`, `RightDef`, `ProviderDef`, `ConditionNode`.
- Produces (all pure, return a new `PolicyFile` or throw `OperationError` with a German message):
```ts
export class OperationError extends Error {}
export function findChannelUsages(args: {channel: string; policy: PolicyFile}): number[]      // right indexes
export function findProviderUsages(args: {name: string; policy: PolicyFile}): number[]
export function addChannel(args: {channel: string; policy: PolicyFile}): PolicyFile
export function renameChannel(args: {from: string; policy: PolicyFile; to: string}): PolicyFile
export function deleteChannel(args: {channel: string; policy: PolicyFile}): PolicyFile
export function upsertProvider(args: {index: number | null; policy: PolicyFile; provider: ProviderDef}): PolicyFile
export function renameProvider(args: {from: string; policy: PolicyFile; to: string}): PolicyFile
export function deleteProvider(args: {index: number; policy: PolicyFile}): PolicyFile
export function upsertRight(args: {index: number | null; policy: PolicyFile; right: RightDef}): PolicyFile  // null → append
export function deleteRight(args: {index: number; policy: PolicyFile}): PolicyFile
export function moveRight(args: {from: number; policy: PolicyFile; to: number}): PolicyFile
```
Messages: `Channel <c> existiert bereits`, `Channel <c> wird noch von <n> Recht(en) verwendet`, `Provider <p> existiert bereits`, `Provider <p> wird noch von <n> Recht(en) verwendet`, `Recht <r> existiert bereits`.

- [ ] **Step 1: Write failing tests:**
  - `Erfolg: Umbenennen eines Providers ändert Referenzen in jeder Tiefe` (3-level fixture).
  - `Erfolg: Umbenennen eines Channels ändert alle Rechte`.
  - `Fehlschlag: lehnt Umbenennung auf vorhandenen Namen ab` (provider and channel).
  - `Fehlschlag: Löschen eines verwendeten Providers/Channels wird abgelehnt`.
  - `Erfolg: neues Recht wird angehängt`; `Erfolg: moveRight verschiebt und ändert die Reihenfolge`.
  - `Erfolg: Operationen verändern das Eingabeobjekt nicht` (deep-equal before/after).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement with `structuredClone` on the input; recursive mapper for condition trees.
- [ ] **Step 4:** Run — PASS; coverage ≥80 % branches for `src/model/`.
- [ ] **Step 5:** Commit `feat: Bearbeitungsoperationen mit Referenzpflege`.

### Task 6: State store and autosave

**Files:**
- Create: `src/state/editorReducer.ts`, `src/state/autosave.ts`, `src/state/useEditor.ts`
- Test: `test/units/state/editorReducer.spec.ts`, `test/units/state/autosave.spec.ts`

**Interfaces:**
- Consumes: Task 2–5 functions.
- Produces:
```ts
export interface EditorState {error: string | null; findings: Finding[]; original: string | null; parseFindings: Finding[]; policy: PolicyFile | null}
export type EditorAction =
  | {text: string; type: 'load'} | {type: 'new'} | {type: 'clearError'}
  | {apply: (p: PolicyFile) => PolicyFile; type: 'edit'}
export function editorReducer(state: EditorState, action: EditorAction): EditorState
export const initialState: EditorState
export function loadAutosave(args: {storage: Storage | undefined}): EditorState | null
export function saveAutosave(args: {state: EditorState; storage: Storage | undefined}): void
export function useEditor(): {dispatch: (a: EditorAction) => void; state: EditorState}
```
`findings` = `validatePolicy` result recomputed after every `load`/`new`/`edit`. `parseFindings` are set on `load` and kept until the next `load`/`new`; the UI shows `[...parseFindings, ...findings]` and, when `parseFindings` contains an `Unbekanntes Feld` finding, a hint that unknown fields are dropped on download. An `edit` whose `apply` throws `OperationError` sets `error` and leaves `policy` unchanged. Autosave key `policy-editor/v1`, value `{original, policy}`.

- [ ] **Step 1: Write failing tests:** `Erfolg: load setzt policy, original und findings`; `Fehlschlag: load mit ungültigem JSON behält bisherigen Stand und setzt error`; `Fehlschlag: edit mit OperationError setzt error, policy bleibt`; `Erfolg: Autosave speichert und lädt`; `Fehlschlag: beschädigter Autosave-Eintrag wird ignoriert` (value `'{kaputt'` and `'{"policy":5}'` → `null`); `Fehlschlag: Storage wirft – kein Absturz` (sinon stub `setItem` throws).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; `useEditor` wraps `useReducer` with `loadAutosave(window.localStorage)` as lazy init and saves in a `useEffect`.
- [ ] **Step 4:** Run — PASS; `npm run typecheck` — PASS.
- [ ] **Step 5:** Commit `feat: Editor-Zustand mit Autosave`.

### Task 7: App shell — load, tabs, validation panel, diff and download

**Files:**
- Create: `src/ui/LoadScreen.tsx`, `src/ui/Header.tsx`, `src/ui/ValidationPanel.tsx`, `src/ui/DiffDialog.tsx`, `src/ui/download.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useEditor`, `serializePolicy`, `diffLines` from `diff`.
- Produces: `App` layout = header (file name, error/warning counts, buttons „Änderungen ansehen", „Herunterladen", „Neu laden") + tab bar (`Channels`, `Provider`, `Rechte`) + main area + right-side `ValidationPanel`. `ValidationPanel` takes `{findings: Finding[]; onSelect: (path: string) => void}`; `onSelect` switches to the tab given by the path's first segment and passes the index to the tab via `selected: {tab: 'channels' | 'providers' | 'rights'; index: number} | null` state in `App`.

- [ ] **Step 1:** `LoadScreen` (shown while `policy === null`): file picker, drop zone, textarea + „Laden", „Leere Konfiguration". Load errors show in a red box.
- [ ] **Step 2:** `Header`, `ValidationPanel` (errors red, warnings amber, click → `onSelect`), `DiffDialog` (`diffLines(original ?? '', serializePolicy(policy))`, added lines green, removed red, unchanged collapsed to 3 lines of context), `download.ts` (`downloadText(args: {filename: string; text: string}): void` via Blob + temporary `<a>`; when findings contain errors, `window.confirm('Die Datei enthält Fehler, die den Start des policy-service verhindern. Trotzdem herunterladen?')` first).
- [ ] **Step 3:** Run `npm run dev`, load `test/fixtures/policy-prod.json` in the browser: 0 errors shown, diff dialog shows „Keine Änderungen", download produces a byte-identical file (`cmp` against the fixture).
- [ ] **Step 4:** `npm run typecheck && npm run check-format && npm test` — PASS.
- [ ] **Step 5:** Commit `feat: App-Gerüst mit Laden, Validierung, Diff und Download`.

### Task 8: Channels and Providers tabs

**Files:**
- Create: `src/ui/ChannelsTab.tsx`, `src/ui/ProvidersTab.tsx`, `src/ui/ProviderForm.tsx`, `src/ui/ParamEditor.tsx`

**Interfaces:**
- Consumes: operations from Task 5 via `dispatch({type:'edit', apply})`; `PROVIDER_CLASSES`.
- Produces: tab components with props `{dispatch; policy: PolicyFile; selected: number | null}`.

- [ ] **Step 1:** `ChannelsTab`: list with usage count, inline rename, delete (disabled with tooltip listing right names when used), add field.
- [ ] **Step 2:** `ProvidersTab`: search box (name/className/description), list with usage count; selecting opens `ProviderForm` (name, className `<select>` of `PROVIDER_CLASSES`, description, negation checkbox, `ParamEditor`, „Verwendet von" list, delete). Renaming a provider calls `renameProvider`, other fields `upsertProvider`. „Neuer Provider" appends a provider with name `Neuer_Provider` (suffix `_2`, `_3`… if taken), className `ContractStateProvider`, `negation: false`.
- [ ] **Step 3:** `ParamEditor`: rows of param name (datalist with param names used by other providers of the same class) + type select (`Text`/`Zahl`/`Ja/Nein`) + chip list of values with add/remove; changing type converts values where possible and otherwise clears them.
- [ ] **Step 4:** Browser check against the prod fixture: rename `Vertrag_aktiv` → `Vertrag_aktiv_neu`, diff shows only the provider line and right references changed; deleting it is blocked; rename back → diff empty. `npm run typecheck && npm run check-format && npm test` — PASS.
- [ ] **Step 5:** Commit `feat: Channels- und Provider-Bearbeitung`.

### Task 9: Rights tab and condition tree builder

**Files:**
- Create: `src/ui/RightsTab.tsx`, `src/ui/RightForm.tsx`, `src/ui/ConditionTree.tsx`

**Interfaces:**
- Consumes: `upsertRight`, `deleteRight`, `moveRight`, `USER_ROLES`.
- Produces: `ConditionTree` props `{onChange: (node: CompositeNode) => void; providers: ProviderDef[]; value: CompositeNode}` (recursive, controlled).

- [ ] **Step 1:** `RightsTab`: list `#<id> <name>` with search, „Neues Recht" appends `{name: 'NeuesRecht' (+suffix), description: '', roles: [], channels: [], condition: undefined}`; ↑/↓ buttons call `moveRight` after `window.confirm('Die öffentlichen IDs der Rechte ändern sich. Fortfahren?')`.
- [ ] **Step 2:** `RightForm`: name, description, role checkboxes (`USER_ROLES`), channel checkboxes (`policy.channels`, plus „alle"/„keine"), toggle „Statisch (ohne Bedingung)", delete.
- [ ] **Step 3:** `ConditionTree`: a group card shows an AND/OR toggle and its children; each provider child is a searchable `<select>` of provider names showing the description as hint; buttons „+ Provider", „+ Gruppe", remove, ↑/↓ within the group. New groups start as `{operator: 'AND', conditions: []}` (the validation panel flags it until filled).
- [ ] **Step 4:** Browser check: add a right with nested `AND(Vertrag_aktiv, OR(Kein_Mitarbeiter, Nicht_MobilcomGroup))`, roles/channels set → 0 errors, diff shows only the appended block in the file's style; remove a provider from a group to empty it → error appears with correct path and jump. `npm run typecheck && npm run check-format && npm test` — PASS.
- [ ] **Step 5:** Commit `feat: Rechte-Bearbeitung mit Bedingungsbaum`.

### Task 10: README and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1:** README (German): purpose, `npm ci`, `npm run dev`, workflow (load → edit → download → PR in `policy-service` by hand), known coupling (provider class and role lists in `src/constants.ts` must follow `ServiceProvider.java` / `UserRole`), test commands, note that the app is local-only.
- [ ] **Step 2:** Full gate: `npm ci && npm run typecheck && npm run check-format && npm test && npm run coverage && npm run build && npm audit` — all pass, model branch coverage ≥80 %, 0 vulnerabilities.
- [ ] **Step 3:** `npm run preview` and repeat the Task 7–9 browser checks against the production build.
- [ ] **Step 4:** `git remote -v` prints nothing; `git status` is clean after commit.
- [ ] **Step 5:** Commit `chore: README für den policy.json-Editor`.
