# Architektur

## M3 Editor-State

Die Planungsseite verwendet einen zentralen `useReducer`-State mit `currentPlan`, `selectedObjectId`, `selectedObjectIds`, `selectedObjectType`, `selectionBox`, `activeTool`, `validationResults`, `dirtyState`, `zoom`, `panOffset`, `gridSizeMm`, `snapToGrid`, Drag-/Resize-/Pan-Flags, Layer-Toggles, `showObjectList`, `transientHint`, `saveStatus`, `exportStatus` und `lastCalculationAt`. Die Canvas rendert nicht mehr aus hart verdrahtetem JSX, sondern aus `room`, `objects`, `chairs`, `seatingBlocks`, `tables`, `tableSeats` und `tableGroups`. Zu den `objects` gehören jetzt auch `seating_area`, `table_area` und automatisch erzeugte `generated_aisle`.

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

Die SVG-Planfläche wandelt Pointer-Koordinaten zentral in Millimeter um. Das Raster kommt aus `gridSizeMm`; mit Shift wird Snap-to-Grid temporär umgangen. Auswahl, Mehrfachauswahl, Auswahlrahmen, Verschieben, Resize-Handles und Löschen arbeiten auf Entity-IDs. Rechteckige Objekte verwenden Mindestgrößen je Rolle, zum Beispiel 1000 x 1000 mm für Bühne/FOH und 300 x 300 mm für Ausgänge.

Werkzeuge in der linken Leiste setzen `activeTool`. Add-Werkzeuge erzeugen Standardobjekte am Klickpunkt und wechseln danach zurück zur Auswahl. Bestuhlungsbereiche und Tischbereiche tragen ihre Generator-Parameter in `properties`. Tabellen und Tischgruppen erzeugen zugehörige `TableSeat`-Daten. `locked` verhindert Verschieben, Skalieren und Löschen, `visible=false` blendet eine Entität aus, ohne sie aus dem Plan zu entfernen.

Mehrfachauswahl wird über `selectedObjectIds` geführt; `selectedObjectId` bleibt als erstes ausgewähltes Objekt für bestehende UI-Pfade erhalten. Bei mehreren Objekten zeigt das Eigenschaftenpanel Sammelaktionen. Die Objektliste ist eine einfache Layersicht für Auswahl, Zentrieren, Lock und Sichtbarkeit.

## Workspace-Viewport und Zoom

Der Planner ist als dreispaltiges Grid aufgebaut: Werkzeugleiste, Workspace und Eigenschaften-/Validierungsleiste bleiben im normalen Layoutfluss. Der Workspace nutzt `grid-template-rows: minmax(0, 1fr) auto`, sodass die Statusbar unten sichtbar bleibt und die Canvas sie nicht überdecken kann.

Die eigentliche Planfläche liegt in `.canvas-viewport` mit eigenem `overflow: auto`. Darin sitzt `.canvas-stage` mit echten berechneten Pixelmaßen. Das SVG behält eine Millimeter-`viewBox`; seine sichtbare Größe wird aus `viewBox.width/height * basePxPerMm * zoom` berechnet. Ein direkter CSS-Transform auf dem SVG wird bewusst vermieden, weil `transform: scale(...)` die optische Größe ändert, ohne die Layoutgröße des scrollbaren Containers zu verändern.

Die Lineale liegen in derselben Stage wie das SVG und nutzen denselben `pxPerMm`-Wert. Fit-to-screen berechnet den passenden Zoom aus der Viewportgröße abzüglich Padding und Linealfläche und begrenzt ihn auf den Editor-Zoombereich.

Ctrl/Cmd+Mausrad zoomt den Canvas und versucht die Mausposition als Fokus zu erhalten. Normales Mausrad scrollt nur den Viewport. Space+Drag und mittlere Maustaste verschieben den Viewport, nicht die Objekte.

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
