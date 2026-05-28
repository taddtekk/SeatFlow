import { ChevronDown, Redo2, RefreshCw, Save, Undo2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";

export function TopBar({
  onExportPdf,
  onRecalculate
}: {
  onExportPdf: () => void;
  onRecalculate: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-area">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="presentation">
            <path d="M7 5l18 9-8 4 6 9L5 18l8-4L7 5z" />
          </svg>
        </span>
        <span className="brand-name">SeatFlow</span>
      </div>

      <nav className="planner-meta" aria-label="Plan-Kontext">
        <button className="meta-select" type="button">
          <span>Projekt:</span>
          <strong>Sommerkonzert 2026</strong>
          <ChevronDown size={14} />
        </button>
        <button className="meta-select" type="button">
          <span>Plan:</span>
          <strong>Hauptbühne - Variante 3</strong>
          <ChevronDown size={14} />
        </button>
        <Badge tone="info">Entwurf (nicht gespeichert)</Badge>
      </nav>

      <div className="topbar-actions">
        <IconButton aria-label="Rückgängig" icon={<Undo2 size={18} />} />
        <IconButton aria-label="Wiederholen" icon={<Redo2 size={18} />} />
        <Button icon={<RefreshCw size={17} />} onClick={onRecalculate} variant="primary">
          Bestuhlung neu berechnen
        </Button>
        <Button icon={<Save size={16} />} variant="secondary" disabled>
          Speichern
        </Button>
        <button className="user-chip" type="button" aria-label="Benutzer AD">
          AD
        </button>
        <button className="topbar-export" type="button" onClick={onExportPdf}>
          PDF exportieren
        </button>
      </div>
    </header>
  );
}
