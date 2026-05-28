# SeatFlow

## M1/M2 Interaktiver Editor und Platzierungslogik

Der Planner unter `/planner` nutzt einen zentralen `useReducer`-Editor-State. Der Plan wird aus strukturierten Plan-Daten gerendert: Raum, Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge, Stühle, Tische, Tischsitze und Tischgruppen. Objekte können ausgewählt, verschoben, skaliert, hinzugefügt und gelöscht werden. Das Eigenschaftenpanel bearbeitet die ausgewählte Entität direkt im Plan-State.

Die Aktionen „Bestuhlung neu berechnen“, „Tischlayout erzeugen“, „Validierung erneut prüfen“, „PDF exportieren“ und „Speichern“ verwenden den aktuellen Plan. Speichern läuft im MVP über das InMemory-Repository und ist daher nur bis zum Server-Neustart persistent. Zusätzlich legt der Browser einen stillen `localStorage`-Entwurf als Komfort-Fallback ab.

## M1.1 Editor-Komfort

Der Editor unterstützt Undo/Redo über die Topbar sowie `Ctrl/Cmd+Z` und `Ctrl/Cmd+Y`. Objektbewegungen rasten standardmäßig auf ein 250-mm-Raster ein; mit gedrückter Shift-Taste kann ohne Raster verschoben werden. Nach Planänderungen läuft die technische Validierung automatisch mit kurzem Debounce im Hintergrund. Tischgruppen erhalten einen gemeinsamen Auswahlrahmen und können als Gruppe bewegt oder skaliert werden.

SeatFlow ist ein webbasiertes Planungstool für Veranstaltungsplanung. Es soll Bestuhlungspläne, Tischpläne und Rettungswegepläne maßstäblich in Millimetern erstellen, Sperrflächen und Fluchtwege berücksichtigen und später regelbasiert prüfen.

Wichtig: SeatFlow ersetzt keine behördliche oder brandschutztechnische Freigabe. Validierungen sind technische Hinweise nach dem gewählten Regelprofil.

## Voraussetzungen

- Node.js `20.20.2`
- npm

## Installation

```bash
npm install
```

## Lokale Entwicklung

```bash
npm run dev
```

- Web: http://localhost:3000/planner
- API: http://localhost:4000/api/health

## Build

```bash
npm run build
```

## Checks

```bash
npm run typecheck
npm run test
npm run build
```

`npm run test` baut die serverseitigen Packages und prüft Geometrie, Platzierungslogik und Validierung mit Node `assert`.

## Produktionsstart lokal wie in Plesk

```bash
npm run start
```

`app.js` ist die zentrale Startdatei und nutzt `process.env.PORT`, mit Fallback auf `3000`.

## Plesk

- Node.js-Version: `20.20.2`
- Application Startup File: `app.js`
- Build-Kommandos: `npm install`, danach `npm run build`
- Start: Plesk startet `node app.js`

## Ordnerstruktur

```text
apps/web              Next.js Frontend
apps/api              Fastify API und Plesk-Server
packages/types        Gemeinsame Domain-Typen
packages/geometry     Browserunabhängige Geometrie
packages/planner-core Auto-Bestuhlung und Tischlayout
packages/rules        Validierung
packages/repositories Repository-Interfaces und InMemory-Daten
packages/export       PDF-Export
public/documents      Öffentliche Dokumentensammlung
public/exports        Erzeugte PDF-Exporte
public/assets         Statische Assets
public/examples       Beispielpläne
docs                  Entwicklerdokumentation
```

## Aktuelle Funktionen

- Demo-Plan unter `/planner`
- Raum, Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge, Stühle, Tische, Tischsitze und Tischgruppen aus Plan-Daten gerendert
- Auswahl, Drag & Drop, rechteckiges Resize, Löschen und Eigenschaftenbearbeitung
- Layer-Toggles für Stühle, Tische, Fluchtwege, Sperrflächen, Raster, Maße und Validierung
- Auto-Bestuhlung per API mit Raumgrenzen, Sperrflächen, Fluchtwegen, FOH, Bühne und Tischen als Blocker
- einfaches Tischlayout mit runden und rechteckigen Tischen
- technische Validierungsmeldungen mit Fehlercodes
- PDF-Export des aktuellen Plans nach `public/exports`
- InMemory-Repositories
- MariaDB-Architektur vorbereitet, noch nicht implementiert

## Geplante Funktionen

- MariaDB-Persistenz
- erweiterte Regelprofile
- belastbare PDF-Layouts
- Benutzer- und Organisationsverwaltung
