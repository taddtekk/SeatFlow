import {
  Armchair,
  Ban,
  BoxSelect,
  Building2,
  CheckSquare2,
  Cloud,
  DoorOpen,
  Eye,
  FileDown,
  Grid3X3,
  Layers,
  Moon,
  Move,
  Ruler,
  Route,
  Rows3,
  Square,
  Table2,
  Trash2
} from "../ui/Icons";
import type { ToolType } from "@seatflow/types";
import type { ReactNode } from "react";
import { ActionButton } from "./ActionButton";
import { DisplayToggle } from "./DisplayToggle";
import { ToolButton } from "./ToolButton";

const tools: Array<{ id: ToolType; icon: ReactNode; label: string }> = [
  { id: "select", icon: <Move size={18} />, label: "Auswahl" },
  { id: "draw_room", icon: <Square size={18} />, label: "Raum zeichnen" },
  { id: "add_stage", icon: <Building2 size={18} />, label: "Bühne hinzufügen" },
  { id: "add_foh", icon: <BoxSelect size={18} />, label: "FOH hinzufügen" },
  { id: "add_no_seat_zone", icon: <Ban size={18} />, label: "Sperrfläche hinzufügen" },
  { id: "add_escape_route", icon: <Route size={18} />, label: "Fluchtweg hinzufügen" },
  { id: "add_exit", icon: <DoorOpen size={18} />, label: "Ausgang hinzufügen" },
  { id: "add_seating_area", icon: <Armchair size={18} />, label: "Bestuhlungsbereich hinzufügen" },
  { id: "add_seating_block", icon: <Rows3 size={18} />, label: "Stuhlblock hinzufügen" },
  { id: "add_table", icon: <Table2 size={18} />, label: "Tisch hinzufügen" },
  { id: "add_table_area", icon: <Grid3X3 size={18} />, label: "Tischbereich hinzufügen" },
  { id: "add_table_group", icon: <Layers size={18} />, label: "Tischgruppe hinzufügen" },
  { id: "delete_object", icon: <Trash2 size={18} />, label: "Objekt löschen" }
];

const toggles = [
  { icon: <Armchair size={15} />, label: "Stühle anzeigen", layer: "showChairs" as const },
  { icon: <Table2 size={15} />, label: "Tische anzeigen", layer: "showTables" as const },
  { icon: <Route size={15} />, label: "Fluchtwege anzeigen", layer: "showEscapeRoutes" as const },
  { icon: <Ban size={15} />, label: "Sperrflächen anzeigen", layer: "showNoSeatZones" as const },
  { icon: <Grid3X3 size={15} />, label: "Raster anzeigen", layer: "showGrid" as const },
  { icon: <Ruler size={15} />, label: "Maße anzeigen", layer: "showMeasurements" as const },
  { icon: <CheckSquare2 size={15} />, label: "Validierung anzeigen", layer: "showValidation" as const }
];

type LayerKey = (typeof toggles)[number]["layer"];

export function ToolSidebar({
  activeTool,
  gridSizeMm,
  layers,
  onExportPdf,
  onGenerateLayouts,
  onGenerateTables,
  onRecalculate,
  onSetGridSize,
  onSetSnapToGrid,
  onToggleObjectList,
  onToggleLayer,
  onToolChange,
  showObjectList,
  snapToGrid
}: {
  activeTool: ToolType;
  gridSizeMm: number;
  layers: Record<"showChairs" | "showTables" | "showEscapeRoutes" | "showNoSeatZones" | "showGrid" | "showMeasurements" | "showValidation", boolean>;
  onExportPdf: () => void;
  onGenerateLayouts: () => void;
  onGenerateTables: () => void;
  onRecalculate: () => void;
  onSetGridSize: (gridSizeMm: number) => void;
  onSetSnapToGrid: (snapToGrid: boolean) => void;
  onToggleObjectList: () => void;
  onToggleLayer: (layer: LayerKey) => void;
  onToolChange: (tool: ToolType) => void;
  showObjectList: boolean;
  snapToGrid: boolean;
}) {
  return (
    <aside className="tool-sidebar" aria-label="Werkzeugleiste">
      <SidebarSection title="Werkzeuge">
        {tools.map((tool) => (
          <ToolButton
            active={activeTool === tool.id}
            icon={tool.icon}
            key={tool.id}
            label={tool.label}
            onClick={() => onToolChange(tool.id)}
          />
        ))}
      </SidebarSection>

      <SidebarSection title="Aktionen">
        <ActionButton icon={<Cloud size={18} />} label="Bestuhlung neu berechnen" onClick={onRecalculate} />
        <ActionButton icon={<Table2 size={18} />} label="Tischlayout erzeugen" onClick={onGenerateTables} />
        <ActionButton icon={<Layers size={18} />} label="Alle Bereiche neu generieren" onClick={onGenerateLayouts} />
        <ActionButton icon={<FileDown size={18} />} label="PDF exportieren" onClick={onExportPdf} />
      </SidebarSection>

      <SidebarSection title="Anzeige">
        {toggles.map((toggle) => (
          <DisplayToggle
            checked={layers[toggle.layer]}
            icon={toggle.icon}
            key={toggle.label}
            label={toggle.label}
            onChange={() => onToggleLayer(toggle.layer)}
          />
        ))}
      </SidebarSection>

      <SidebarSection title="Raster">
        <label className="display-toggle">
          <span className="display-toggle-label">
            <Grid3X3 size={15} />
            Einrasten
          </span>
          <input checked={snapToGrid} onChange={(event) => onSetSnapToGrid(event.currentTarget.checked)} type="checkbox" />
          <span className="display-toggle-switch" />
        </label>
        <label className="grid-size-field">
          <span>Rastergröße</span>
          <select value={gridSizeMm} onChange={(event) => onSetGridSize(Number(event.currentTarget.value))}>
            {[100, 250, 500, 1000].map((size) => (
              <option key={size} value={size}>
                {size} mm
              </option>
            ))}
          </select>
        </label>
        <p className="sidebar-hint">Shift halten zum freien Verschieben.</p>
      </SidebarSection>

      <SidebarSection title="Objekte">
        <button className={`view-mode-button ${showObjectList ? "is-active" : ""}`} onClick={onToggleObjectList} type="button">
          <span>
            <Layers size={16} />
            Objektliste
          </span>
          <Eye size={15} />
        </button>
      </SidebarSection>

      <SidebarSection title="Ansicht">
        <button className="view-mode-button" type="button">
          <span>
            <Moon size={16} />
            Dunkel
          </span>
          <Eye size={15} />
        </button>
      </SidebarSection>
    </aside>
  );
}


function SidebarSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="sidebar-section">
      <h2>{title}</h2>
      <div className="sidebar-section-content">{children}</div>
    </section>
  );
}
