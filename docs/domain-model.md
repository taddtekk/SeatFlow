# Domain-Modell

## M1 Editor-State

Der Editor-State ist eine UI-Schicht über dem Plan-Modell. Er speichert den aktuellen Plan, aktive Werkzeuge, Auswahl, Zoom, Layer-Sichtbarkeit, Dirty-State und Validierungsergebnisse. Der Plan bleibt die fachliche Quelle; Interaktionen schreiben Änderungen in `DrawingObject`, `Table`, `TableGroup`, `Chair` und `ValidationResult`.

In M1 sind alle bearbeitbaren Geometrien rechteckig. Polygone bleiben im Typmodell vorbereitet, werden aber noch nicht interaktiv bearbeitet.

Ein Plan besteht aus Raum, Zeichenobjekten, Bestuhlung, Tischen, Regelprofil und Validierungsergebnis.

- Raum: maßstäbliche Grundfläche.
- Bühne: belegte Fläche ohne Stühle.
- FOH: Regie- oder Technikbereich.
- Fluchtweg: freizuhaltender Korridor.
- Sperrfläche: No-Go-Zone wie Technik, Treppe oder Kamerapodest.
- Ausgang: markierter Ausgang oder Notausgang.
- Stuhl: Einzelplatz.
- Stuhlblock: Gruppe automatisch platzierter Stühle.
- Tisch: runder oder rechteckiger Tisch.
- Tischgruppe: logische Gruppe von Tischen.
- Regelprofil: Mindestmaße und Grenzwerte.
- Validierung: technische Hinweise, Warnungen und Fehler.

## Beispiel

```json
{
  "id": "plan-demo",
  "name": "Demo-Bestuhlungsplan",
  "status": "Entwurf",
  "room": {
    "id": "room-demo",
    "role": "room",
    "name": "Beispielhalle",
    "geometry": { "kind": "rect", "rect": { "x": 0, "y": 0, "width": 30000, "height": 20000 } }
  },
  "objects": [],
  "chairs": [],
  "tables": []
}
```
