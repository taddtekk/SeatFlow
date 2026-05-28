# Architektur

## M3 Editor-State

Die Planungsseite verwendet einen zentralen `useReducer`-State mit `currentPlan`, `selectedObjectId`, `selectedObjectType`, `activeTool`, `validationResults`, `dirtyState`, `zoom`, `panOffset`, `gridSizeMm`, `snapToGrid`, Drag-/Resize-Flags, Layer-Toggles, `saveStatus`, `exportStatus` und `lastCalculationAt`. Die Canvas rendert nicht mehr aus hart verdrahtetem JSX, sondern aus `room`, `objects`, `chairs`, `seatingBlocks`, `tables`, `tableSeats` und `tableGroups`. Zu den `objects` gehören jetzt auch `seating_area`, `table_area` und automatisch erzeugte `generated_aisle`.

SVG Pointer Events steuern Auswahl, Drag & Drop und Resize-Handles. Unterstützt werden rechteckige Objekte, Bereiche und Tische. Freie Polygone, echte Mehrbenutzerbearbeitung und dauerhafte MariaDB-Persistenz folgen später.

Mutierende Aktionen schreiben vorherige Planstände in `undoStack`; `redoStack` wird nach neuen Änderungen geleert. Validierungsergebnisse werden debounced über `/api/validate-plan` aktualisiert und nicht als eigene Undo-Stufe behandelt. `localStorage` speichert einen stillen Browser-Entwurf, wenn der Plan dirty ist; das InMemory-Repository bleibt die serverseitige MVP-Speicherung.

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

## Interaktionen

Die SVG-Planfläche wandelt Pointer-Koordinaten zentral in Millimeter um. Das Raster kommt aus `gridSizeMm`; mit Shift wird Snap-to-Grid temporär umgangen. Auswahl, Verschieben, Resize-Handles und Löschen arbeiten auf Entity-IDs. Rechteckige Objekte verwenden Mindestgrößen je Rolle, zum Beispiel 1000 x 1000 mm für Bühne/FOH und 300 x 300 mm für Ausgänge.

Werkzeuge in der linken Leiste setzen `activeTool`. Add-Werkzeuge erzeugen Standardobjekte am Klickpunkt und wechseln danach zurück zur Auswahl. Bestuhlungsbereiche und Tischbereiche tragen ihre Generator-Parameter in `properties`. Tabellen und Tischgruppen erzeugen zugehörige `TableSeat`-Daten.

## Generatoren und Validierung

`packages/planner-core` enthält `generateSeating(plan, options)`, `generateTableLayout(plan, options)` und `generateLayouts(plan, options)`. Wenn Bestuhlungsbereiche oder Tischbereiche vorhanden sind, werden sie bevorzugt genutzt. Ohne Bereiche greift ein freier Fallback im Raum. Die Bestuhlung unterstützt einfache linke/rechte Gänge, Mittelgänge und Querwege; diese werden als `generated_aisle` sichtbar gemacht.

`packages/rules` enthält `validatePlan(plan, ruleProfile)`. Die Validierung prüft technische Kollisionen, Bereichszuordnung von Stühlen, Blockgrößen, Tischsitze, zu schmale Fluchtwege, blockierte Ausgänge, Tische außerhalb des Raums und Mindestabstände. Sie ersetzt keine behördliche oder brandschutztechnische Freigabe.

## API-Fluss

Die Frontend-Aktionen senden den aktuellen Plan an `/api/generate-seating`, `/api/generate-table-layout`, `/api/generate-layouts`, `/api/validate-plan`, `/api/export/pdf` und `PUT /api/plans/:id`. Die API akzeptiert direkt einen Plan oder `{ plan, options }`, damit einzelne Bereiche oder alle Bereiche generiert werden können.

## Plesk

`app.js` liegt im Root und ist die Plesk-Startdatei. Sie lädt `.env` und startet `apps/api/dist/plesk-server.js`, das Fastify, Static Files und die gebaute Next.js-App zusammenführt.

## Public-Verzeichnis

`/public` ist öffentlich. Dort liegen öffentliche Dokumente, Assets, Beispiele und erzeugte Exporte. Entwicklerdokumentation liegt getrennt unter `/docs`.

## Millimeter

Alle Maße werden intern in Millimetern gespeichert. Dadurch bleiben Pläne unabhängig von Bildschirmauflösung, Zoom und Exportmaßstab.

## MariaDB-Vorbereitung

Datenzugriff läuft über Repository-Interfaces. Aktuell nutzt die API InMemory-Repositories. Später können `MariaDb*Repository`-Klassen ergänzt werden, ohne Frontend oder Core-Logik umzubauen.
