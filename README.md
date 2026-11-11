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

- Tabs für Channels, Provider und Rechte; Umbenennen und Löschen berücksichtigt Verwendungen, damit keine verwaisten Referenzen entstehen
- Baumeditor für rekursive Bedingungen (`AND` / `OR`, Provider-Namen und verschachtelte Gruppen)
- Validierung nach den Regeln des Starts von `DatabaseService` im `policy-service`; Befunde tragen einen Pfad, über den die UI zur Stelle springt
- Diff gegen die geladene Datei
- Das Schreiben folgt der festen Feldreihenfolge der `policy.json`, damit Änderungen minimale Diffs erzeugen
- Autosave des Bearbeitungsstands im `localStorage` des Browsers

## Bekannte Kopplung

Die Liste der Rollen (`USER_ROLES`) und die Liste der Provider-Klassen (`PROVIDER_CLASSES`) stehen in `src/constants.ts` und sind eine Kopie aus `policy-service`. Sie müssen manuell nachgezogen werden, wenn sich `UserRole` oder `ServiceProvider.java` dort ändern — sonst lehnt das Werkzeug gültige Werte ab oder lässt ungültige zu.

## Tests und Qualität

```bash
npm run typecheck     # tsc -b (src und test)
npm run check-format  # Prettier prüfen (npm run format zum Formatieren)
npm test              # Mocha, test/units/**/*.spec.ts
npm run coverage      # Branch-Coverage des Modells (src/model), Ziel mindestens 80 %
npm audit
```

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
├── fixtures/      # policy-prod.json, policy-test.json
└── units/         # Mocha-Tests, spiegeln src/
```

Die Fixtures `test/fixtures/policy-prod.json` und `test/fixtures/policy-test.json` sind Byte-Kopien der `policy-config/policy.json` und `policy-config-test/policy.json` des policy-service.
