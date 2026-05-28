# MariaDB-Datenmodell

SeatFlow soll später MariaDB nutzen. Es werden keine PostgreSQL- oder PostGIS-Funktionen vorausgesetzt.

## Tabellenideen

- `users`: Benutzer, später Auth.
- `organizations`: Firmen oder Teams.
- `projects`: Veranstaltungen oder Planungsprojekte.
- `venues`: Locations und Hallen.
- `plans`: aktueller Planstand.
- `plan_versions`: Snapshots historischer Planstände.
- `drawing_objects`: Raum, Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge.
- `seating_blocks`: Stuhlblöcke.
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

`plan_versions.plan_json` speichert vollständige Plan-Snapshots. Das erleichtert Versionsvergleich und Wiederherstellung.
