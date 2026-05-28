# MVP-Roadmap

## Status M1/M2

M1 ist als erster interaktiver Editor umgesetzt: Plan-State, Objekt-Auswahl, Verschieben, Skalieren, Hinzufügen, Löschen, Layer-Toggles, InMemory-Speichern, Validierung und PDF-Export mit aktuellem Plan sind angebunden. Die nächste Ausbaustufe sollte präzisere Zeichenwerkzeuge, Undo/Redo und persistente MariaDB-Speicherung ergänzen.

M1.1 ergänzt Undo/Redo, 250-mm-Snap-to-Grid mit Shift-Bypass, automatische Debounce-Validierung und einen gemeinsamen Bedienrahmen für Tischgruppen.

M2-Grundlagen sind jetzt vorhanden: `generateSeating(plan, options)` verwendet den aktuellen Plan und blockiert Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge und Tische. `generateTableLayout(plan, options)` erzeugt einfache runde oder rechteckige Tische mit Sitzplätzen und grober Kollisionsvermeidung. Die Rules prüfen Stühle, Tische, Fluchtwege, Ausgänge und Mindestabstände mit strukturierten Fehlercodes.

- M0 Projektfundament: Monorepo, Plesk-Start, Packages, Demo-Plan.
- M1 Interaktiver Editor: Objekte zeichnen, auswählen, verschieben und bearbeiten.
- M2 Auto-Bestuhlung: bessere Blocklogik, Ganglogik und Zielkapazitäten. Grundlogik umgesetzt, Optimierung offen.
- M3 Tischplanung: Tischarten, Tischgruppen und Abstandsregeln. Grundlayout umgesetzt, Detailregeln offen.
- M4 Validierung und Regelprofile: profilierte technische Prüfung.
- M5 PDF-Export: Layout, Legende, Maßstab, Varianten.
- M6 MariaDB-Anbindung: Repository-Implementierungen und Migrationen.
- M7 Plesk-Produktionsbetrieb: Logging, Monitoring, Backups.
