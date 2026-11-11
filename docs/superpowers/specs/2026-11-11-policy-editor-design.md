# policy-editor — Design

Datum: 2026-11-11 · Status: zur Freigabe

## Ziel

Ein browserbasiertes Werkzeug, mit dem Entwickler des Team Middleware die Rechtekonfiguration
`policy.json` des `policy-service` bequem und fehlerfrei erstellen oder bearbeiten. Das Ergebnis wird
heruntergeladen und wie bisher per Pull Request in `policy-service` eingebracht.

**Erfolgskriterien**

- Eine `policy.json`, die das Werkzeug ohne Validierungsfehler herunterlädt, startet den `policy-service`
  (gleiche Regeln wie `DatabaseService.PolicyConfig.load`).
- Laden und unverändertes Speichern der produktiven `policy.json` ergibt eine byte-identische Datei —
  Änderungen erzeugen minimale Diffs.
- Umbenennen oder Löschen von Channels/Providern kann keine verwaisten Referenzen hinterlassen.

## Rahmen (vom Auftraggeber festgelegt)

| Punkt     | Entscheidung                                                                 |
| --------- | ---------------------------------------------------------------------------- |
| Nutzer    | Entwickler des Teams                                                         |
| Ablauf    | Datei laden → bearbeiten → herunterladen → PR in `policy-service` von Hand   |
| Hosting   | vorerst nur lokal (`npm run dev` / `npm run preview`), statischer Build      |
| Backend   | keines, keine Zugangsdaten, keine GitHub-Anbindung                           |
| Stack     | React 19, TypeScript (strict), Vite, Tailwind CSS v4 (Team-Frontend-Stack)   |
| Tests     | Mocha, Chai, Sinon; Testbeschreibungen deutsch mit `Erfolg:` / `Fehlschlag:` |
| Ablageort | `~/dev/policy-editor`, eigenes Git-Repository                                |

Nicht im Umfang: Hosting/Deployment, Authentifizierung, GitHub-PR-Erstellung, Bearbeitung durch
Fachanwender ohne JSON-Kenntnis, Pflege der Provider-Implementierungen selbst.

## Das Dateiformat (Quelle: `policy-service`, Branch `feat/MIDL-1159-policy-json-format`)

```json
{
  "channels": ["PRIVATESERVICE", "MYMCIS"],
  "providers": [
    {
      "name": "Vertrag_aktiv",
      "className": "ContractStateProvider",
      "description": "Vertrag ist aktiv",
      "negation": false,
      "params": [{"name": "ContractStates", "values": ["ACTIVE", "ACTIVE_PLANNED"]}]
    }
  ],
  "rights": [
    {
      "name": "TarifdetailsAnzeigen",
      "description": "Dürfen Tarifdetails angezeigt werden",
      "roles": ["PRODUCT_OWNER"],
      "channels": ["PRIVATESERVICE"],
      "condition": {"operator": "AND", "conditions": ["Vertrag_aktiv", {"operator": "OR", "conditions": ["A", "B"]}]}
    }
  ]
}
```

Feldreihenfolge beim Schreiben: Top-Level `channels, providers, rights`; Provider
`name, className, description, negation, params`; Parameter `name, values`; Recht
`name, description, roles, channels, condition`; Bedingung `operator, conditions`. Optionale Felder
(`description`, `params` beim Provider; `condition` beim Recht) werden weggelassen, wenn sie fehlen.

## Validierungsregeln (Spiegel von `DatabaseService.PolicyConfig.load`)

Meldungstexte werden wörtlich aus dem Service übernommen, damit Werkzeug und Service-Log übereinstimmen.
Jeder Befund trägt einen Pfad (z. B. `rights[12].condition.conditions[1]`), über den die UI zur Stelle springt.

1. Unbekannte Felder auf jeder Ebene → Fehler (Service nutzt `FAIL_ON_UNKNOWN_PROPERTIES`).
2. `providers` und `rights` vorhanden und nicht leer; `channels` nicht leer, ohne Duplikate, keine leeren Strings.
3. Provider: `name` Pflicht und eindeutig; `className` Pflicht und in der Liste der unterstützten Klassen;
   `negation` Pflicht (Boolean); `description` optional; `params` optional.
4. Parameter: `name` Pflicht und je Provider eindeutig; `values` darf laut Service fehlen, laut README ist es
   eine nicht leere Liste eines einzigen Typs (String, Ganzzahl im Long-Bereich, Boolean). Das Werkzeug
   meldet Verstöße gegen die README-Regel als **Warnung**, Verstöße gegen die Service-Regel (Nicht-Ganzzahl) als **Fehler**.
5. Recht: `name` Pflicht und eindeutig; `description` Pflicht; `roles` nicht leer, ohne Duplikate, nur
   `UserRole`-Werte; `channels` nicht leer, ohne Duplikate, nur Werte aus `channels`.
6. `condition` optional; falls vorhanden, muss die Wurzel ein Objekt mit `operator` und `conditions` sein.
   `operator` ∈ {`AND`, `OR`}; `conditions` nicht leer; Einträge sind Provider-Namen (müssen existieren)
   oder verschachtelte Bedingungen, beliebig tief.

**Feste Listen** in `src/constants.ts`, mit Quellenangabe im Kommentar:

- Rollen (`UserRole`): `PRODUCT_OWNER`, `PRODUCT_USER`, `INTERESTED_PERSON`, `ACCOUNT_ADMIN`, `SYSTEM`
- Provider-Klassen (`ServiceProvider.PROVIDER_RESOLVERS`, 19): ContractAssociationProvider,
  ContractBarringTypeProvider, ContractOptionProvider, ContractStateProvider, ContractTypeProvider,
  CustomerTypeProvider, DunningLevelProvider, MNPProvider, MarkProvider, MarketingPermitProvider,
  MultiSimProvider, NetworkProvider, OpenItemProvider, PaymentTypeProvider, PersonTypeProvider,
  RecommenderProvider, SimOrderProvider, TariffReferenceProvider, VvlProvider

Kommt im Service ein Provider hinzu, muss diese Liste nachgezogen werden (bekannte Kopplung, im README
dokumentiert).

## Funktionen

- **Laden:** Datei wählen, per Drag & Drop, Text einfügen oder leere Konfiguration. Nicht parsebare
  Eingaben werden mit klarer Meldung abgelehnt; der bisherige Stand bleibt unverändert.
- **Autosave:** Arbeitsstand und Original im `localStorage`; Zugriffe in `try/catch`, die App funktioniert
  auch ohne Speicher.
- **Channels:** hinzufügen, umbenennen (Referenzen in allen Rechten werden mitgezogen), löschen (gesperrt,
  solange genutzt — mit Liste der nutzenden Rechte).
- **Provider:** durchsuchbare Liste; Formular für `name`, `className` (Auswahl aus den 19 Klassen),
  `description`, `negation`, `params` (Name + typisierte Werteliste; Parameternamen werden aus anderen
  Providern derselben Klasse vorgeschlagen). „Verwendet von" zeigt die Rechte. Umbenennen zieht
  Referenzen in allen Bedingungen nach; Löschen gesperrt, solange referenziert.
- **Rechte:** Liste in Dateireihenfolge mit öffentlicher ID (#1 …); Formular für `name`, `description`,
  Rollen- und Channel-Checkboxen, Bedingungsbaum. Baum-Editor: Provider-Referenz oder Gruppe hinzufügen,
  Operator AND/OR umschalten, verschachteln, Einträge verschieben und löschen; Schalter „statisch (ohne
  Bedingung)". Neue Rechte werden angehängt. Umsortieren bestehender Rechte nur nach Bestätigung, weil
  sich die öffentlichen IDs ändern.
- **Validierungs-Panel:** dauerhaft sichtbar, Fehler und Warnungen mit Sprung zur Stelle. Download ist bei
  Fehlern möglich, aber mit deutlichem Hinweis.
- **Download + Diff:** zeilenbasierter Diff gegen die geladene Originaldatei, Download als `policy.json`.

## Architektur

```
src/
├── model/
│   ├── PolicyTypes.ts        Typen des Dateiformats (Union Types, keine Enums)
│   ├── parse.ts              JSON → Modell, unbekannte Felder als Befund
│   ├── serialize.ts          Modell → Text im bestehenden Stil
│   ├── validate.ts           alle Regeln oben → Befund-Liste {severity, path, message}
│   └── operations.ts         rename/delete mit Referenzpflege, add/move, usages
├── constants.ts              Rollen, Provider-Klassen
├── state/                    useReducer-Store, Autosave
└── ui/                       Tabs, Formulare, ConditionTree, ValidationPanel, DiffView
test/units/                   spiegelt src/
```

`model/` ist frei von React und vollständig unit-getestet; die UI ruft ausschließlich `operations.ts`
über den Reducer auf.

**Serialisierungsstil:** 2 Leerzeichen Einrückung, `": "` als Trenner, genau ein abschließender Zeilenumbruch
nach der letzten `}` (wie die bestehende Datei; der Round-Trip-Test legt das exakt fest). Ein Wert wird
einzeilig geschrieben, wenn er ein Array aus Skalaren ist oder ein Objekt, dessen Werte ausschließlich
Skalare, Arrays aus Skalaren oder (bei Bedingungen) Provider-Namen sind; alles andere mehrzeilig.

## Fehlerbehandlung

- Parse-Fehler: Meldung mit Zeile/Spalte aus `JSON.parse`, kein Zustandswechsel.
- Strukturfehler (falsche Typen): als Validierungsbefund, die Datei wird so weit wie möglich geladen.
- Gesperrte Aktionen (Löschen genutzter Elemente, doppelte Namen beim Umbenennen) werden in der UI
  verhindert und begründet, nicht erst durch die Validierung.

## Tests

- **Round-Trip:** produktive und Test-`policy.json` aus `policy-service` (als Fixtures kopiert) →
  parse → serialize ergibt byte-identischen Text; beide validieren ohne Fehler.
- **Validierung:** je Regel ein `Erfolg:`- und ein `Fehlschlag:`-Test mit erwarteter Meldung und Pfad.
- **Operationen:** Umbenennen zieht Referenzen nach (auch tief verschachtelt), Löschen genutzter Elemente
  wird abgelehnt, neue Rechte landen am Ende, Verschieben ändert IDs.
- **UI:** manuelle Prüfung im Browser (Laden, Bearbeiten, Bedingungsbaum, Download).
- Mindestens 80 % Branch-Coverage für `src/model/`.
