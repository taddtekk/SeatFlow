# Architektur

## Ziel von SeatFlow

SeatFlow soll Bestuhlungspläne für Veranstaltungshallen planbar, prüfbar und später exportierbar machen. Nutzer sollen Räume, Bühnen, FOH-Positionen, Fluchtwege, Sperrflächen und Ausgänge modellieren. Darauf aufbauend platziert das System Stühle automatisch und meldet Regelverletzungen.

## Monorepo-Aufbau

Das Repository ist als pnpm-Monorepo organisiert:

- `apps/web`: Next.js-Frontend für die Planungsoberfläche.
- `apps/api`: Fastify-API für Demo-Daten, Bestuhlungsgenerierung und Validierung.
- `packages/types`: Gemeinsame TypeScript-Typen für Fachobjekte.
- `packages/geometry`: Kleine Geometrie-Helfer für Rechtecke, Stühle und Umrechnung.
- `packages/planner-core`: Erste automatische Reihenbestuhlung.
- `packages/rules`: Erste Validierungsregeln.
- `packages/ui`: Kleine wiederverwendbare UI-Komponenten.

## Frontend

Das Frontend nutzt Next.js und rendert im MVP eine SVG-Zeichenfläche. Der Beispielplan wird aus den gemeinsamen Packages erzeugt, damit UI und API dieselbe Fachlogik verwenden können.

## API

Die API ist bewusst schlank mit Fastify gebaut. Sie bietet:

- `GET /health`
- `GET /demo-plan`
- `POST /generate-seating`
- `POST /validate-plan`

Im ersten Schritt gibt es keine Datenbank und keine Authentifizierung. Pläne werden als JSON-Strukturen verarbeitet.

## Warum Millimeter?

Alle Maße werden intern in Millimetern gespeichert. Das vermeidet Rundungsfehler bei Plänen, ermöglicht klare Regelprüfungen und ist nah an realen Bau- und Veranstaltungsplänen. Die Anzeige kann später beliebig in Pixel, Meter oder Druckmaße umgerechnet werden.

## Erweiterbarkeit

Spaetere Module koennen an klaren Grenzen ergaenzt werden:

- Zeichenwerkzeuge im Frontend
- Persistenz in der API
- komplexere Polygon-Geometrie im Geometry-Package
- optimierte Platzierung im Planner-Core
- Regelprofile je Bundesland, Location oder Veranstaltungsart im Rules-Package
- Exportmodule für PDF, SVG und CAD-nahe Formate

## Annahmen im MVP

Der MVP verwendet rechteckige Objekte und einen einfachen Rasteralgorithmus. Diese Entscheidung hält die erste Version prüfbar und lässt genug Raum für robustere Algorithmen in späteren Phasen.
