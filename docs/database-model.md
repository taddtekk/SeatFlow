# MariaDB-Datenmodell

SeatFlow soll später MariaDB nutzen. Es werden keine PostgreSQL- oder PostGIS-Funktionen vorausgesetzt.

## Tabellenideen

- `users`: Benutzer, später Auth.
- `organizations`: Firmen oder Teams.
- `projects`: Veranstaltungen oder Planungsprojekte.
- `venues`: Locations und Hallen.
- `plans`: aktueller Planstand.
- `plan_versions`: Snapshots historischer Planstände.
- `drawing_objects`: Raum, Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge, Bestuhlungsbereiche, Tischbereiche und generierte Gänge.
- `seating_blocks`: Stuhlblöcke mit optionaler `area_id` und Bounds.
- `chairs`: einzelne Stühle.
- `table_groups`: Tischgruppen.
- `tables`: Tische.
- `table_seats`: Sitzplätze an Tischen.
- `rule_profiles`: Regelprofile.
- `validation_results`: gespeicherte Prüfungen.
- `exports`: erzeugte PDFs und spätere SVGs.

## JSON-Geometrie

Geometrien werden zunächst MariaDB-kompatibel als JSON gespeichert:

- `geometry_json`
- `properties_json`
- `metadata_json`
- `validation_json`

`plan_versions.plan_json` speichert vollständige Plan-Snapshots. Das erleichtert Versionsvergleich und Wiederherstellung.

## MVP-Speicherung

Im aktuellen M3-Schritt bleibt MariaDB vorbereitet, aber deaktiviert. `PUT /api/plans/:id` schreibt in das InMemory-Repository und setzt `updatedAt`, `updatedAtIso`, `lastSavedAt` und `metadata.savedAtIso`. Später soll jede Speicherung zusätzlich als `plan_versions.plan_json` landen, damit Planstände verglichen und wiederhergestellt werden können.
