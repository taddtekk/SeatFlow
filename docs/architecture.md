# Architektur

## M1 Editor-State

Die Planungsseite verwendet einen zentralen `useReducer`-State mit `currentPlan`, `selectedObjectId`, `activeTool`, `validationResults`, `dirtyState`, `zoom`, Layer-Toggles und `lastCalculationIso`. Die Canvas rendert nicht mehr aus hart verdrahtetem JSX, sondern aus `room`, `objects`, `chairs`, `tables` und `tableGroups`.

SVG Pointer Events steuern Auswahl, Drag & Drop und Resize-Handles. Unterstützt werden in M1 rechteckige Objekte und Tische. Freie Polygone, echte Mehrbenutzerbearbeitung und dauerhafte MariaDB-Persistenz folgen später.

SeatFlow ist als npm-Workspace-Monorepo aufgebaut. Die Kernlogik liegt in browserunabhängigen Packages, damit Frontend, API und spätere Worker dieselben Regeln nutzen können.

## Systemaufbau

- `apps/web`: Next.js/React-Oberfläche.
- `apps/api`: Fastify-API und Plesk-Produktionsserver.
- `packages/types`: gemeinsame Typen.
- `packages/geometry`: Rechteck- und Kollisionsfunktionen ohne DOM-Abhängigkeiten.
- `packages/planner-core`: Auto-Bestuhlung und einfache Tischplanung.
- `packages/rules`: technische Validierung.
- `packages/repositories`: Repository-Interfaces, InMemory-Implementierungen und MariaDB-Platzhalter.
- `packages/export`: PDF-Export ohne Headless-Browser.

## Plesk

`app.js` liegt im Root und ist die Plesk-Startdatei. Sie lädt `.env`, registriert TypeScript-Unterstützung über `tsx` und startet den Fastify/Next-Server.

## Public-Verzeichnis

`/public` ist öffentlich. Dort liegen öffentliche Dokumente, Assets, Beispiele und erzeugte Exporte. Entwicklerdokumentation liegt getrennt unter `/docs`.

## Millimeter

Alle Maße werden intern in Millimetern gespeichert. Dadurch bleiben Pläne unabhängig von Bildschirmauflösung, Zoom und Exportmaßstab.

## MariaDB-Vorbereitung

Datenzugriff läuft über Repository-Interfaces. Aktuell nutzt die API InMemory-Repositories. Später können `MariaDb*Repository`-Klassen ergänzt werden, ohne Frontend oder Core-Logik umzubauen.
