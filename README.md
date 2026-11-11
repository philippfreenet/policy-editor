# policy-editor

Lokales Browser-Werkzeug zum Bearbeiten der Rechtekonfiguration `policy.json` des Java-Services `policy-service` (Team Middleware). Es lädt eine `policy.json`, erlaubt das Bearbeiten von Channels, Providern und Rechten, prüft die Datei mit denselben Regeln wie der Start des Services und liefert das Ergebnis als Download. Die Datei wird anschließend von Hand per Pull Request in `policy-service` eingebracht.

## Voraussetzungen

- Node.js — es gibt kein `engines`-Feld in `package.json`; entwickelt und geprüft wurde mit Node 26.13.0
- npm

## Start

```bash
npm ci
npm run dev       # Entwicklungsserver (Vite)
```

Für den statischen Produktions-Build: `npm run build`, danach `npm run preview`.

## Ablauf

1. `policy.json` aus `policy-service` laden (Datei auswählen oder ablegen).
2. In den Tabs Channels, Provider und Rechte bearbeiten.
3. Über die Diff-Ansicht die Änderungen gegen die geladene Datei prüfen.
4. Datei herunterladen.
5. Die heruntergeladene Datei in `policy-service` einchecken und per Pull Request einbringen — das Werkzeug erstellt keinen PR.

## Funktionen

- Seitenleiste mit den Bereichen Rechte, Provider, Channels und Übersicht; Umbenennen und Löschen berücksichtigt Verwendungen, damit keine verwaisten Referenzen entstehen
- Inspektor je Recht nach „Wer · Wo · Wann“: Rollen, Channels und Bedingung; Bedingungen mit `AND` / `OR`, verschachtelten Gruppen und Provider-Suche im Block-Editor, zusätzlich als lesbare Formel, z. B. `Vertrag_aktiv AND (A OR B)`
- Rechteliste durchsuchbar mit Freitext und den Schlüsseln `rolle:`, `channel:` und `provider:` (in beliebiger Tiefe der Bedingung), zusätzlich über Filtermenüs
- Provider-Inspektor mit Parametern und den Rechten, die den Provider verwenden
- Ansicht „Übersicht“: Matrix Rolle × Channel mit der Anzahl der Rechte je Zelle; eine Zelle listet ihre Rechte mit Bedingung und öffnet sie per Klick
- Tastenkürzel: `/` springt in die Suche der aktuellen Ansicht, `↑` / `↓` verschieben die Auswahl in der Rechte- und Providerliste (Fokus in der Liste), `Strg/⌘+Z`, `Strg/⌘+⇧+Z`, `Strg+Y` für Rückgängig/Wiederholen (bis 100 Schritte, auch über die Kopfleiste); in Textfeldern und bei offenem Dialog greift kein Kürzel, dort bleibt das Rückgängig des Browsers aktiv
- Bestätigungsdialoge vor dem Löschen, vor dem Verwerfen ungespeicherter Änderungen und vor dem Herunterladen einer Datei mit Fehlern
- Dunkelmodus folgt der Systemeinstellung (`prefers-color-scheme`); Animationen entfallen bei `prefers-reduced-motion`
- Validierung nach den Regeln des Starts von `DatabaseService` im `policy-service`; Befunde tragen einen Pfad, über den die UI zur Stelle springt (Prüf-Panel)
- Diff gegen die geladene Datei
- Das Schreiben folgt der festen Feldreihenfolge der `policy.json`, damit Änderungen minimale Diffs erzeugen
- Autosave des Bearbeitungsstands im `localStorage` des Browsers

## Bekannte Kopplung

Die Liste der Rollen (`USER_ROLES`) und die Liste der Provider-Klassen (`PROVIDER_CLASSES`) stehen in `src/constants.ts` und sind eine Kopie aus `policy-service`. Sie müssen manuell nachgezogen werden, wenn sich `UserRole` oder `ServiceProvider.java` dort ändern — sonst lehnt das Werkzeug gültige Werte ab oder lässt ungültige zu.

## Tests und Qualität

```bash
npm run typecheck     # tsc -b (src und test)
npm run check-format  # Prettier prüfen (npm run format zum Formatieren)
npm test              # Mocha: Unit-Tests (test/units) und Komponententests (test/components)
npm run coverage      # Branch-Coverage des Modells (src/model), Ziel mindestens 80 %
npm audit
```

Die Oberfläche nutzt `@headlessui/react` (Dialoge, Menüs); die Komponententests laufen mit Testing Library (`@testing-library/react`, `@testing-library/user-event`) in `jsdom` (`global-jsdom`).

`package.json` pinnt per `overrides` `glob` und `minimatch` auf nicht verwundbare Versionen, weil `mocha` und `c8` (über `test-exclude`) sonst ältere, für Denial of Service anfällige Versionen mitbringen (Stand 11/2026, mit entferntem Override meldet `npm audit` 5 Schwachstellen). Die Overrides können entfallen, sobald `mocha` und `c8` ohne sie auf unbedenkliche Versionen auflösen; das prüft man, indem man sie entfernt, neu installiert und `npm audit` ausführt.

**Ganzzahlen:** Ganzzahlige Parameterwerte werden als JavaScript-Safe-Integer geprüft (Betrag höchstens 2^53−1). Größere Java-`long`-Werte werden als Befund gemeldet und würden beim Herunterladen gerundet.

## Lokal, ohne Netzwerk

Die Anwendung läuft vollständig im Browser, hat kein Backend und macht zur Laufzeit keine Netzwerkaufrufe. Es gibt keine Zugangsdaten und keine GitHub-Anbindung. Die geladene Datei verlässt den Rechner nicht.

## Projektstruktur

```
src/
├── constants.ts   # Rollen und Provider-Klassen (Kopplung an policy-service)
├── model/         # Dateiformat: Typen, parse, serialize, validate, Operationen
├── state/         # Editor-Reducer, useEditor, Autosave
└── ui/            # React-Komponenten und UI-Hilfsfunktionen
test/
├── components/    # Komponententests (Testing Library, jsdom)
├── fixtures/      # policy-prod.json, policy-test.json
├── setup/         # jsdom-Einrichtung für Mocha
└── units/         # Mocha-Tests, spiegeln src/
```

Die Fixtures `test/fixtures/policy-prod.json` und `test/fixtures/policy-test.json` sind Byte-Kopien der `policy-config/policy.json` und `policy-config-test/policy.json` des policy-service.
