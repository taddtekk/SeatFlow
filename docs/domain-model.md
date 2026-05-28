# Domain-Modell

## M3 Plan-Datenmodell

Der Editor-State ist eine UI-Schicht über dem Plan-Modell. Er speichert den aktuellen Plan, aktive Werkzeuge, Auswahl, Zoom, Layer-Sichtbarkeit, Dirty-State und Validierungsergebnisse. Der Plan bleibt die fachliche Quelle; Interaktionen schreiben Änderungen in `DrawingObject`, `Table`, `TableGroup`, `Chair` und `ValidationResult`.

In M3 sind alle bearbeitbaren Geometrien rechteckig. Polygone bleiben im Typmodell vorbereitet, werden aber noch nicht interaktiv bearbeitet.

Für Undo/Redo speichert der Editor kompakte History-Einträge mit Plan-Snapshot und Auswahl. Diese History ist nur clientseitig und wird nicht in der späteren Datenbank persistiert.

Ein Plan besteht aus Raum, Zeichenobjekten, Bestuhlung, Tischen, Tischsitzen, Tischgruppen, Regelprofil, Validierungsergebnis und Metadaten. `version` zählt die Planvariante, `metadata.projectName` enthält im Demo-Plan „Sommerkonzert 2026“.

- Raum: maßstäbliche Grundfläche.
- Bühne: belegte Fläche ohne Stühle.
- FOH: Regie- oder Technikbereich.
- Fluchtweg: freizuhaltender Korridor.
- Sperrfläche: No-Go-Zone wie Technik, Treppe oder Kamerapodest.
- Ausgang: markierter Ausgang oder Notausgang.
- Stuhl: Einzelplatz.
- Bestuhlungsbereich: rechteckiger Generatorbereich für Stuhlreihen.
- Stuhlblock: Gruppe automatisch platzierter Stühle.
- Tisch: runder oder rechteckiger Tisch.
- Tischbereich: rechteckiger Generatorbereich für Tischlayouts.
- Tischgruppe: logische Gruppe von Tischen.
- Generierter Gang: automatisch erzeugter interner Gang in einem Bestuhlungsbereich.
- Regelprofil: Mindestmaße und Grenzwerte.
- Validierung: technische Hinweise, Warnungen und Fehler.

## Rechteckige Geometrie

Interaktive Geometrien sind aktuell Rechtecke:

```json
{ "kind": "rect", "rect": { "x": 3000, "y": 1000, "width": 8000, "height": 4000 } }
```

Alle Werte sind Millimeter. Polygone bleiben vorbereitet, werden aber noch nicht gezeichnet oder bearbeitet.

## Objektrollen

Unterstützte Rollen sind `room`, `stage`, `foh`, `escape_route`, `exit`, `no_seat_zone`, `stairs`, `stage_access`, `technical_area`, `chair`, `seating_area`, `seating_block`, `table`, `table_area`, `table_group`, `generated_aisle`, `wheelchair_area` und `note`.

## Bestuhlungsbereiche

`seating_area` ist ein `DrawingObject` mit rechteckiger Geometrie. Relevante Properties sind `orientationDeg`, `chairWidthMm`, `chairDepthMm`, `rowPitchMm`, `targetSeatCount`, `maxSeatCount`, `generateMode`, `leftAisleMm`, `rightAisleMm`, `centerAisleMm`, `crossAisleEveryRows` und `blockNamePrefix`.

Generierte Stühle erhalten `rowIndex`, `seatIndex`, `label`, `blockId` und `seatingAreaId`. Interne Gänge werden als `generated_aisle` mit `properties.generated=true` und `sourceAreaId` im Plan geführt.

## Tischbereiche

`table_area` ist ein `DrawingObject` mit rechteckiger Geometrie. Relevante Properties sind `tableLayoutType`, `tableType`, `targetSeats`, `seatsPerTable`, `tableDiameterMm`, `tableWidthMm`, `tableDepthMm`, `tableSpacingMm`, `chairDistanceMm`, `rowSpacingMm` und `orientationDeg`.

## Tische

Tischtypen sind `round`, `rectangle`, `banquet`, `parliamentary`, `block`, `u_shape` und `custom`. Legacy-Aliasse aus fruehen MVP-Daten bleiben typseitig lesbar. Tabellen speichern Position kompatibel als `x`/`y` und `position`, die aktuelle Logik normalisiert beide Formen.

## Beispiel

```json
{
  "id": "plan-demo",
  "projectId": "project-demo",
  "name": "Hauptbühne - Variante 3",
  "status": "Entwurf",
  "version": 3,
  "room": {
    "id": "room-demo",
    "role": "room",
    "name": "Haupthalle",
    "geometry": { "kind": "rect", "rect": { "x": 3000, "y": 1000, "width": 40000, "height": 32000 } }
  },
  "objects": [
    { "id": "seating-area-left", "role": "seating_area", "name": "Bestuhlungsbereich A" },
    { "id": "table-area-demo", "role": "table_area", "name": "Tischbereich Lounge" }
  ],
  "chairs": [],
  "tables": [],
  "metadata": { "projectName": "Sommerkonzert 2026" }
}
```
