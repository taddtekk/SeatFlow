# SeatFlow

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
- Raum, Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge, Stühle und Tische sichtbar
- Auto-Bestuhlung per API
- einfaches Tischlayout
- Validierungsmeldungen
- PDF-Export nach `public/exports`
- InMemory-Repositories
- MariaDB-Architektur vorbereitet, noch nicht implementiert

## Geplante Funktionen

- echter interaktiver Editor mit Zeichnen, Verschieben und Größenänderung
- MariaDB-Persistenz
- erweiterte Regelprofile
- belastbare PDF-Layouts
- Benutzer- und Organisationsverwaltung
