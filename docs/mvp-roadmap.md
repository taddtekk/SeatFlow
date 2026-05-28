# MVP-Roadmap

## Status M3

M1 ist als erster interaktiver Editor umgesetzt: Plan-State, Objekt-Auswahl, Verschieben, Skalieren, Hinzufügen, Löschen, Layer-Toggles, InMemory-Speichern, Validierung und PDF-Export mit aktuellem Plan sind angebunden. Die nächste Ausbaustufe sollte präzisere Zeichenwerkzeuge, Undo/Redo und persistente MariaDB-Speicherung ergänzen.

M1.1 ergänzt Undo/Redo, 250-mm-Snap-to-Grid mit Shift-Bypass, automatische Debounce-Validierung und einen gemeinsamen Bedienrahmen für Tischgruppen.

M2-Grundlagen sind jetzt vorhanden: `generateSeating(plan, options)` verwendet den aktuellen Plan und blockiert Bühne, FOH, Sperrflächen, Fluchtwege, Ausgänge und Tische. `generateTableLayout(plan, options)` erzeugt einfache runde oder rechteckige Tische mit Sitzplätzen und grober Kollisionsvermeidung. Die Rules prüfen Stühle, Tische, Fluchtwege, Ausgänge und Mindestabstände mit strukturierten Fehlercodes.

M3 ergänzt Bestuhlungsbereiche, Tischbereiche, interne generierte Gänge, bereichsbezogene Generator-Einstellungen, `POST /api/generate-layouts`, bessere Validierung für Blöcke/Tischsitze/Anbindungen und einen zweitseitigen PDF-Export mit Validierungsbericht.

M3.1 stabilisiert den Workspace-Viewport: Die Canvas ist jetzt ein eigener Scrollbereich, Zoom wird über echte Stage-/SVG-Pixelgrößen aus der Millimeter-`viewBox` berechnet und Fit-to-screen nutzt die verfügbare Viewportgröße. Dadurch bleiben Sidebars und Statusbar stabil sichtbar, auch wenn bei 120 % oder höher gescrollt werden muss.

M3.2 verbessert die Editor-Bedienung: Mehrfachauswahl per Shift-Klick und Auswahlrahmen, Objektliste, Lock/Visibility, Space-/Mittelklick-Pan, Ctrl/Cmd+Mausrad-Zoom, Rastergrößen und Snap-Bypass sind umgesetzt. Die Statusbar zeigt Auswahl, Snap, Raster und aktives Werkzeug.

- M0 Projektfundament: Monorepo, Plesk-Start, Packages, Demo-Plan.
- M1 Interaktiver Editor: Objekte zeichnen, auswählen, verschieben und bearbeiten.
- M2 Auto-Bestuhlung: bessere Blocklogik, Ganglogik und Zielkapazitäten. Grundlogik umgesetzt, Optimierung offen.
- M3 Layout-Engine und Planungsbereiche: Bestuhlungsbereiche, Tischbereiche, interne Gänge und Generator-Panel umgesetzt; Workspace-Viewport in M3.1 stabilisiert; Editor-Ergonomie in M3.2 erweitert; Optimierung offen.
- M4 Validierung und Regelprofile: technische Prüfung erweitert, profilierte Regelverwaltung offen.
- M5 PDF-Export: Planübersicht und Validierungsbericht umgesetzt, Maßstabs-/Layoutvarianten offen.
- M6 MariaDB-Anbindung: Repository-Implementierungen und Migrationen.
- M7 Plesk-Produktionsbetrieb: Logging, Monitoring, Backups.
