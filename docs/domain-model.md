# Domain-Modell

## Fachobjekte

- Raum / Halle: Grundfläche des Plans mit Breite, Höhe und Umriss.
- Bühne: Fläche, die für Stühle gesperrt ist.
- FOH: Technikposition im Publikumsbereich, ebenfalls für Stühle gesperrt.
- Fluchtweg: Freier Korridor, der nicht bestuhlt werden darf und Mindestbreiten erfüllen muss.
- Sperrfläche: Generische Fläche, in der keine Stühle platziert werden dürfen.
- Ausgang: Markierter Auslasspunkt oder Ausgangsbereich.
- Stuhl: Einzelner Platz mit Position, Breite, Tiefe und Rotation.
- Stuhlblock: Gruppe automatisch oder manuell platzierter Stühle.
- Bestuhlungsplan: Gesamtes Planobjekt mit Raum, Objekten, Regelprofil und Validierung.
- Regelprofil: Konfiguration von Mindestmassen und Grenzwerten.
- Warnung / Fehler: Ergebnis einer Regelprüfung.

## Beispiel-JSON

```json
{
  "id": "plan-demo",
  "name": "Demo-Bestuhlungsplan",
  "room": {
    "id": "room-main",
    "name": "Beispielhalle",
    "type": "room",
    "rect": { "x": 0, "y": 0, "width": 30000, "height": 20000 },
    "widthMm": 30000,
    "heightMm": 20000,
    "outline": {
      "points": [
        { "x": 0, "y": 0 },
        { "x": 30000, "y": 0 },
        { "x": 30000, "y": 20000 },
        { "x": 0, "y": 20000 }
      ]
    }
  },
  "stage": {
    "id": "stage-main",
    "name": "Bühne",
    "type": "stage",
    "rect": { "x": 6000, "y": 700, "width": 18000, "height": 3200 }
  },
  "foh": {
    "id": "foh-main",
    "name": "FOH",
    "type": "foh",
    "rect": { "x": 13000, "y": 14200, "width": 4000, "height": 2500 }
  },
  "escapeRoutes": [
    {
      "id": "route-left",
      "name": "Fluchtweg links",
      "type": "escapeRoute",
      "rect": { "x": 8800, "y": 3900, "width": 1400, "height": 15100 },
      "widthMm": 1400
    }
  ],
  "noSeatZones": [],
  "exits": [],
  "chairs": [],
  "seatingBlocks": [],
  "ruleProfile": {
    "id": "rules-demo",
    "name": "Demo-Regelprofil",
    "minAisleWidthMm": 1200,
    "minSeatWidthMm": 500,
    "minRowClearanceMm": 900,
    "maxRowsPerBlock": 12,
    "maxSeatsToOneAisle": 10,
    "maxSeatsBetweenTwoAisles": 20,
    "maxDistanceToExitMm": 35000
  }
}
```
