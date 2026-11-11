# policy-editor — UI-Redesign

Datum: 2026-11-11 · Status: zur Freigabe · Basis: `2026-11-11-policy-editor-design.md`

## Ziel

Die Oberfläche des policy-editor wird so umgebaut, dass Entwickler die `policy.json` intuitiv bearbeiten:
ohne JSON-Denken, mit klarem Ablauf und ruhigem, dichtem Werkzeug-Design. Modell, Validierung und
Serialisierung bleiben unverändert — der byte-identische Round-Trip und alle Prüfregeln gelten weiter.

**Ausgangslage (Rückmeldung des Auftraggebers):** Alle vier Kernaufgaben sind umständlich (Recht anlegen,
Bedingung bauen, Rechte finden/verstehen, Provider pflegen); die UI wirkt zu technisch, unübersichtlich,
optisch roh, und der Ablauf ist unklar.

**Zielgruppe:** ausschließlich Entwickler. Technische Namen (Provider-Namen, Klassen, Rollen-Konstanten)
bleiben sichtbar, werden aber durch Beschreibungen und Zusammenfassungen erklärt.

**Erfolgskriterien**

- Ein Entwickler, der das Werkzeug zum ersten Mal öffnet, legt ohne Erklärung ein Recht mit Rollen,
  Channels und verschachtelter Bedingung an.
- Für jedes Recht ist auf einen Blick erkennbar, **wer** es **wo** und **wann** (unter welcher Bedingung) erhält,
  inklusive der Bedeutung jedes beteiligten Providers.
- Alle bestehenden Funktionen bleiben erhalten (Laden, Autosave, Rückgängig/Wiederholen, Validierung mit
  Sprung zur Stelle, Diff, Download, Übersicht Rolle × Channel, Referenzpflege bei Umbenennen/Löschen).
- WCAG 2.2 AA: vollständig per Tastatur bedienbar, sichtbarer Fokus, Kontrast AA in hellem und dunklem Modus.

## Rahmen

| Punkt          | Entscheidung                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------- |
| Grundkonzept   | Inspektor „Wer · Wo · Wann“ (Liste + Detailansicht)                                          |
| Bedingungen    | Block-Editor („Alle / Mindestens eine der folgenden treffen zu“)                             |
| Stil           | „Ruhig & dicht“: kühles Grau, ein Indigo-Akzent, Linien statt Schatten, 13px Grundschrift    |
| Schriften      | Systemschriften (`system-ui`, `ui-monospace`) — offline, keine Abhängigkeit                  |
| Dunkelmodus    | folgt `prefers-color-scheme`                                                                 |
| Neue Pakete    | `@headlessui/react` (Combobox, Menu, Popover, Dialog); Testing Library + jsdom (nur Tests)   |
| Zielbreiten    | 1440 px und mindestens 1024 px; darunter gestapelt und bedienbar, nicht mobil-optimiert       |
| Unverändert    | `src/model/`, `src/state/`, `src/constants.ts`; alles lokal, kein Remote, kein Push          |

Neue Pakete werden exakt gepinnt und nur in Versionen übernommen, die mindestens drei Tage alt sind;
`npm audit` bleibt bei 0.

Nicht im Umfang: Mobil-Optimierung, Mehrsprachigkeit, Befehlspalette, Drag & Drop, Auswertung von
Bedingungen gegen Testdaten, Änderungen am Dateiformat oder an den Prüfregeln.

## Aufbau

```
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ policy-editor│  ↶ ↷                                      [Herunterladen]   │
│              ├──────────────────────┬──────────────────────────────────────┤
│ Rechte    49 │ ⌕ Suche / Filter     │  SimkarteSperren           ID 4  ⋯   │
│ Provider  48 │ #3 …                 │  Kann die Sim-Karte gesperrt werden  │
│ Channels  11 │ #4 SimkarteSperren ● │  WER   [PRODUCT_OWNER] … + Rolle     │
│ Übersicht    │ #5 …                 │  WO    [PRIVATESERVICE] … + 6        │
│              │                      │  WANN  Alle ▾ der folgenden …        │
│ ✓ gültig     │                      │        ┌ Gruppe ─────────────┐       │
│ Änderungen 2 │                      │        │ NICHT Nicht_Mobilcom… │     │
└──────────────┴──────────────────────┴──────────────────────────────────────┘
```

### Rahmen (AppShell)

- **Seitenleiste:** Bereiche Rechte, Provider, Channels, Übersicht mit Zählern; darunter der Prüfstatus
  („✓ Datei gültig“ bzw. „n Fehler · m Warnungen“) und „Änderungen (n)“. Status-Klick öffnet das
  Prüf-Panel, „Änderungen“ öffnet den Diff-Dialog.
- **Kopfleiste:** Rückgängig, Wiederholen, Dateiname, „Neu laden“ und die Hauptaktion **Herunterladen**.
- Das Prüf-Panel ist ein ausklappbares Seitenpanel (nicht mehr dauerhaft eine eigene Spalte).
- Bereiche sind über die Seitenleiste und die Tastatur erreichbar; die aktive Ansicht ist per
  `aria-current` markiert.

### Startbildschirm

Zentrale Ablagefläche (Datei wählen, Drag & Drop, Text einfügen), „Leere Konfiguration anlegen“ und —
falls ein Autosave existiert — „Letzten Stand fortsetzen“. Parse-Fehler erscheinen mit Zeile/Spalte;
der bisherige Stand bleibt unverändert.

### Rechte

**Liste**
- Eintrag: öffentliche ID, Name (Monospace), Zusammenfassung „3 Rollen · 10 Channels · 4 Bedingungen“
  bzw. „alle Channels“ / „immer“ (statisch).
- Markierungen: Punkt für *geändert* (gegenüber der geladenen Datei), Fehlermarke für Rechte mit Befunden.
- Suchzeile: Freitext über Name und Beschreibung, zusätzlich Schlüssel `rolle:`, `channel:`, `provider:`
  (Groß-/Kleinschreibung egal). Gesetzte Filter erscheinen als entfernbare Chips unter der Suche;
  Rollen-, Channel- und Provider-Filter sind zusätzlich über ein Filter-Menü wählbar.
- „+ Neues Recht“ im Listenkopf.

**Inspektor**
- Kopf: Name (Monospace) und Beschreibung, beide per Klick direkt bearbeitbar (InlineEdit: Enter übernimmt,
  Escape verwirft, Fokusverlust übernimmt). „ID n“ und ein „⋯“-Menü mit *Position ändern…* und *Löschen…*.
- **Wer:** Rollen als Chips mit Entfernen-Knopf; „+ Rolle“ öffnet ein Popover mit Checkliste aller Rollen.
  Unbekannte Rollen (nicht in `USER_ROLES`) sind als Fehler-Chip markiert.
- **Wo:** Channels als Chips; ab mehr als 6 Einträgen „+ n weitere“ zum Aufklappen. Auswahl-Popover mit
  Suche, Häkchen sowie „alle“ / „keine“. Unbekannte Channels als Fehler-Chip.
- **Wann:** statisch („Gilt immer“ mit Knopf „+ Bedingung“) oder Block-Editor (s. u.). Darunter die
  Formel aus `formatCondition` als lesende Kontrollzeile.
- Befunde, deren Pfad zu diesem Recht gehört, erscheinen direkt am betroffenen Block bzw. Feld.

### Block-Editor (Bedingung)

- Jede Gruppe ist ein Kasten mit Segmentschalter **Alle** (`AND`) / **Mindestens eine** (`OR`) und dem
  Text „der folgenden treffen zu“. Ein ungültiger Operator aus der Datei wird als Fehler angezeigt und
  lässt sich über den Schalter korrigieren.
- Provider-Zeile: Name (Monospace), Beschreibung, `NICHT`-Kennzeichen bei `negation: true` und eine
  Kurzform der Parameter („ContractStates ∈ ACTIVE, ACTIVE_PLANNED, …“). Unbekannte Provider-Namen als
  Fehlerzeile. Aktionen je Zeile: nach oben/unten, entfernen, in Gruppe fassen.
- Gruppen-Aktionen („⋯“): nach oben/unten, entfernen, **Gruppe auflösen** (ersetzt die Gruppe durch ihre
  Einträge an derselben Stelle — nur auf ausdrücklichen Klick, nie automatisch).
- Hinzufügen: „+ Provider“ öffnet eine Combobox, die Name **und** Beschreibung durchsucht; „+ Gruppe“
  legt eine leere Untergruppe an. Leere Gruppen zeigen einen Hinweis statt einer leeren Fläche.
- Beliebige Verschachtelungstiefe; die Einrückung bleibt durch abgesetzte Flächen lesbar, ohne Karten in
  Karten zu stapeln (Gruppen als leicht getönte Fläche, Provider als Zeilen darin).

### Provider

- Liste: Name, Beschreibung, Zahl der nutzenden Rechte.
- Inspektor: Name (InlineEdit, zieht Referenzen nach), Klasse (Auswahl aus den 19 Klassen), Beschreibung,
  Negation als Schalter, Parameter mit Werten als Chips (typisiert wie bisher, Parameternamen-Vorschläge
  aus Providern derselben Klasse).
- Satzbeschreibung oben: „Trifft zu, wenn ContractStates ∈ ACTIVE, ACTIVE_PLANNED, DEACTIVE_PLANNED“
  bzw. „Trifft **nicht** zu, wenn …“ bei Negation; ohne Parameter „Trifft zu laut ContractStateProvider“.
- „Verwendet von“: klickbare Rechte (springen in den Inspektor des Rechts). Löschen ist gesperrt, solange
  der Provider verwendet wird — mit Begründung.

### Channels

Liste mit Nutzungszähler, Umbenennen direkt in der Zeile (zieht Referenzen nach), Löschen gesperrt, solange
genutzt (mit Liste der Rechte), Eingabefeld „Channel hinzufügen“.

### Übersicht

Die bestehende Matrix Rolle × Channel im neuen Stil; eine Zelle listet ihre Rechte mit Formel und öffnet
sie im Inspektor.

## Abläufe

- **Neues Recht:** wird angehängt, im Inspektor geöffnet, Fokus im Namen. Leere Blöcke zeigen Hinweise
  („Mindestens eine Rolle wählen“, „Mindestens einen Channel wählen“); Wann startet als „Gilt immer“.
- **Riskante Aktionen** (Löschen, Position ändern, Datei neu laden mit ungespeicherten Änderungen,
  Download trotz Fehlern) öffnen einen Dialog (Headless UI `Dialog`) statt `window.confirm`, der die Folgen
  konkret nennt, z. B. „Die IDs von 45 Rechten verschieben sich.“
- **Position ändern…:** Dialog mit Eingabe der Ziel-ID (1 … n) und Vorschau der verschobenen Rechte.
- **Abgelehnte Operationen** (doppelter Name, leerer Name) erscheinen am Feld; der Wert bleibt im Feld
  stehen, damit er korrigiert werden kann.
- **Tastatur:** `/` fokussiert die Suche (nicht in Textfeldern), ↑/↓ wechseln in der Liste, Enter öffnet,
  `⌘/Strg+Z` und `⌘/Strg+⇧+Z` bzw. `Strg+Y` wie bisher. Popover, Menüs und Dialoge: Fokusfalle, Escape
  schließt, Fokus kehrt zum Auslöser zurück.

## Zustände

| Zustand      | Auslöser                                   | Anzeige und nächster Schritt                                                  |
| ------------ | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Leer         | keine Rechte/Provider/Channels             | Erklärender Satz und Knopf „Erstes … anlegen“                                 |
| Leer (Suche) | Filter ohne Treffer                        | „Keine Treffer“ und „Filter zurücksetzen“                                     |
| Fehler       | Parse-Fehler beim Laden                    | Meldung mit Zeile/Spalte auf dem Startbildschirm, alter Stand bleibt          |
| Fehler       | abgelehnte Operation                       | Meldung am Feld bzw. im Dialog                                                |
| Fehler       | Validierungsbefund                         | Markierung in Liste und am Feld; Prüf-Panel mit Sprung zur Stelle             |
| Teilweise    | unbekannte Felder in der geladenen Datei   | Hinweisbox im Prüf-Panel; Felder gehen beim Speichern verloren (wie bisher)   |
| Erfolg       | Download                                   | kurze Meldung „policy.json heruntergeladen“ (Live-Region), Änderungen sichtbar |
| Laden        | —                                          | entfällt: alles läuft lokal und synchron                                      |
| Berechtigung | —                                          | entfällt: keine Anmeldung, keine Rollen im Werkzeug                           |

## Design-System

- Tokens als CSS-Variablen in `src/index.css` über Tailwind 4 `@theme`: Flächen (`--bg`, `--surface`,
  `--sidebar`), Linien, Text (`--text`, `--muted`), Akzent (Indigo), Semantik (Fehler, Warnung, Erfolg),
  Chip-Farben für Wer (Indigo-Ton) und Wo (Grün-Ton), `NICHT`-Kennzeichen (Rot-Ton). Jede Farbe hat einen
  Dunkelmodus-Wert; Kontrast AA für Text und Bedienelemente in beiden Modi.
- Typografie: 13px Grundschrift, Monospace für technische Namen, Abschnittsbeschriftungen klein in
  Großbuchstaben. Klickflächen mindestens 24 × 24 px.
- Bewegung nur für Zustandswechsel (Popover, Panel), abgeschaltet bei `prefers-reduced-motion`.
- Keine Karten in Karten, keine Verläufe, keine dekorativen Elemente.

## Technik

- **Unverändert:** `src/model/`, `src/state/`, `src/constants.ts`; die UI ruft weiterhin nur über
  `dispatch` die Operationen aus `operations.ts` auf.
- **Neue reine Funktionen** (React-frei, unit-getestet), Ablage `src/ui/logic/`:
  - `parseSearch({text}) → RightFilter` — Freitext plus `rolle:` / `channel:` / `provider:`
  - `summarizeRight({right, policy}) → string`
  - `describeProvider({provider}) → string`
  - `findingsAt({findings, prefix}) → Finding[]`
  - `changedRights({original, policy}) → Set<number>` — Vergleich gegen die geladene Datei, Zuordnung über
    den Namen (verschobene Rechte gelten nicht als geändert, nur wenn ihr Inhalt abweicht; ein Recht
    ohne gleichnamiges Original — neu oder umbenannt — gilt als geändert; ohne geladene Datei ist nichts markiert)
  - `dissolveGroupAt({path, root}) → CompositeNode` — ergänzt `conditionTreeOps.ts`
- **Komponenten** (`src/ui/`): `AppShell`, `Sidebar`, `TopBar`, `StartScreen`, `RightsView`
  (`RightList`, `RightInspector`), `ConditionBuilder` (`ConditionGroupBlock`, `ProviderRow`,
  `ProviderPicker`), `ChipSelect`, `InlineEdit`, `ActionMenu`, `ConfirmDialog`, `ProvidersView`,
  `ChannelsView`, `OverviewView`, `FindingsDrawer`, `DiffDialog`. Bestehende UI-Dateien, die ersetzt
  werden, entfallen; weiterhin genutzte Hilfen (`conditionTreeOps`, `convertValues`, `pathTarget` …)
  bleiben mit ihren Tests.
- `pathTarget` wird so erweitert, dass ein Befund-Pfad auch die Stelle im Inspektor (Block bzw. Feld)
  benennt, zu der gesprungen und fokussiert wird.

## Tests und Abnahme

- Bestehende Tests bleiben grün (aktuell 187); `typecheck`, `prettier --check`, `build`, `npm audit` = 0.
- Unit-Tests (`Erfolg:` / `Fehlschlag:`) für jede neue reine Funktion.
- Komponententests mit Testing Library + jsdom für `ConditionBuilder` (Operator umschalten, Provider
  hinzufügen über Suche nach Beschreibung, Gruppe auflösen, Verschachtelung), `ProviderPicker`,
  `InlineEdit` (Enter / Escape / Fokusverlust, abgelehnter Name) und `ConfirmDialog` (Fokus, Escape).
- Abschluss-Prüfung nach ECC `frontend-design-direction`: Screenshots bei 1440 × 900 und 1024 × 768 mit der
  produktiven `policy.json`, hell und dunkel; Tastatur-Durchgang (alle Aktionen ohne Maus), sichtbarer
  Fokus, Kontrast, reduzierte Bewegung, lange Namen; alle Zustände aus der Tabelle oben. Nachweis-Protokoll
  im Arbeitsverzeichnis, geprüft mit dem Checker des Skills.
