import { ChevronDown, Redo2, RefreshCw, Save, Undo2 } from "../ui/Icons";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";

export function TopBar({
  dirty,
  onExportPdf,
  onRecalculate,
  onSave,
  planName,
  projectName
}: {
  dirty: boolean;
  onExportPdf: () => void;
  onRecalculate: () => void;
  onSave: () => void;
  planName: string;
  projectName: string;
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
          <strong>{projectName}</strong>
          <ChevronDown size={14} />
        </button>
        <button className="meta-select" type="button">
          <span>Plan:</span>
          <strong>{planName}</strong>
          <ChevronDown size={14} />
        </button>
        <Badge tone={dirty ? "info" : "success"}>{dirty ? "Entwurf (nicht gespeichert)" : "Gespeichert"}</Badge>
      </nav>

      <div className="topbar-actions">
        <IconButton aria-label="Rückgängig" icon={<Undo2 size={18} />} />
        <IconButton aria-label="Wiederholen" icon={<Redo2 size={18} />} />
        <Button icon={<RefreshCw size={17} />} onClick={onRecalculate} variant="primary">
          Bestuhlung neu berechnen
        </Button>
        <Button icon={<Save size={16} />} onClick={onSave} variant="secondary" disabled={!dirty}>
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
