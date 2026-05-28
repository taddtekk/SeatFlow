# SeatFlow

SeatFlow ist ein webbasiertes Planungstool für Bestuhlungspläne in Veranstaltungshallen. Dieses Repository enthält das initiale MVP-Grundgerüst als TypeScript-Monorepo mit Next.js-Frontend, Fastify-API und gemeinsamen Fachpaketen.

## Voraussetzungen

- Node.js 20 oder neuer
- pnpm 10 oder neuer
- Git

Falls pnpm lokal fehlt:

```powershell
npm install -g pnpm
```

## Installation

```powershell
pnpm install
```

## Entwicklung starten

```powershell
pnpm dev
```

Danach laufen standardmaessig:

- Web-App: http://localhost:3000
- API: http://localhost:4000

Die Planungsdemo ist unter http://localhost:3000/planner erreichbar.

## Plesk-Deployment

SeatFlow ist auf Node.js `20.20.2` vorbereitet. Für Plesk ist der Produktionsstart so gebaut, dass eine einzige Node-App sowohl Next.js als auch die Fastify-API ausliefert.

Empfohlene Plesk-Einstellungen:

- Node.js-Version: `20.20.2`
- Application root: Repository-Ordner
- Application startup file: `app.js`
- Application parameters: leer lassen
- Document root: Repository-Ordner
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=<von Plesk gesetzter Port oder 3000>`
  - `SEATFLOW_SKIP_AUTO_PUSH=1`

Build- und Installationsbefehle in Plesk:

```bash
npm install
npm run build
```

Im Plesk-Betrieb sind danach erreichbar:

- Web-App: `/`
- Planungsseite: `/planner`
- API direkt: `/health`, `/demo-plan`, `/generate-seating`, `/validate-plan`
- API mit Prefix: `/api/health`, `/api/demo-plan`, `/api/generate-seating`, `/api/validate-plan`

Wichtig: `SEATFLOW_SKIP_AUTO_PUSH=1` verhindert, dass ein Build auf dem Server zurück nach GitHub pusht. Lokal bleibt der Auto-Push nach erfolgreichem Build aktiv.

## Wichtige Skripte

```powershell
pnpm dev
pnpm typecheck
pnpm build
```

## Projektstruktur

```text
apps/
  web/      Next.js Frontend
  api/      Fastify API
packages/
  types/        Gemeinsame TypeScript-Typen
  geometry/     Geometrie-Helfer
  planner-core/ Einfache automatische Reihenbestuhlung
  rules/        Erste Validierungen
  ui/           Kleine gemeinsame UI-Komponenten
docs/
  architecture.md
  mvp-roadmap.md
  domain-model.md
```

## Aktueller MVP-Stand

- Beispielraum mit 30000 mm x 20000 mm
- Bühne, FOH, Fluchtwege und Ausgangsobjekte als Mock-Daten
- Automatische Raster-/Reihenbestuhlung
- Ausschluss von Bühne, FOH, Sperrflächen und Fluchtwegen
- Einfache Regelprüfung mit Warnungen und Fehlern
- API-Endpunkte `/health`, `/demo-plan`, `/generate-seating`, `/validate-plan`

## Annahmen

- Alle fachlichen Maße werden intern in Millimetern gespeichert.
- Der erste MVP nutzt keine Datenbank und keine echte Authentifizierung.
- Rechteckige Objekte reichen für die erste Demo; Polygone sind im Domain-Modell vorbereitet.
- Die automatische Platzierung ist bewusst einfach gehalten und wird später durch robustere Optimierung ersetzt.
