import type { Plan, SaveStatus, ToolType, ValidationResult } from "@seatflow/types";

export function StatusBar({
  activeTool,
  gridSizeMm,
  lastCalculationIso,
  lockedSelection,
  plan,
  saveStatus,
  selectedCount,
  snapToGrid,
  validationResults,
  zoom
}: {
  activeTool: ToolType;
  gridSizeMm: number;
  lastCalculationIso?: string | undefined;
  lockedSelection: boolean;
  plan: Plan;
  saveStatus: SaveStatus;
  selectedCount: number;
  snapToGrid: boolean;
  validationResults: ValidationResult;
  zoom: number;
}) {
  const seatingAreas = plan.objects.filter((object) => object.role === "seating_area").length;
  const tableAreas = plan.objects.filter((object) => object.role === "table_area").length;
  const errors = validationResults.messages.filter((message) => message.severity === "error").length;
  const warnings = validationResults.messages.filter((message) => message.severity === "warning").length;
  return (
    <footer className="statusbar">
      <span>Stühle gesamt: <strong>{plan.chairs.length}</strong></span>
      <span>Tischsitze: <strong>{plan.tableSeats.length}</strong></span>
      <span>Tische gesamt: <strong>{plan.tables.length}</strong></span>
      <span>Bestuhlungsbereiche: <strong>{seatingAreas}</strong></span>
      <span>Tischbereiche: <strong>{tableAreas}</strong></span>
      <span>Regelprofil: <strong>{plan.ruleProfile.name}</strong></span>
      <span>Fehler: <strong>{errors}</strong></span>
      <span>Warnungen: <strong>{warnings}</strong></span>
      <span>Stuhlbreite: <strong>{plan.ruleProfile.minSeatWidthMm} mm</strong></span>
      <span>Reihenabstand: <strong>{plan.ruleProfile.minRowClearanceMm} mm</strong></span>
      <span>Raster: <strong>{gridSizeMm} mm</strong></span>
      <span>Snap: <strong>{snapToGrid ? "Ein" : "Aus"}</strong></span>
      <span>Auswahl: <strong>{selectedCount}</strong></span>
      <span>Modus: <strong>{toolLabel(activeTool)}</strong></span>
      {lockedSelection ? <span>Auswahl: <strong>Gesperrt</strong></span> : null}
      <span>Letzte Berechnung: <strong>{formatTime(lastCalculationIso ?? plan.updatedAtIso)}</strong></span>
      <span>Zoom: <strong>{Math.round(zoom * 100)} %</strong></span>
      <span>Speicherstatus: <strong>{formatSaveStatus(saveStatus)}</strong></span>
    </footer>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatSaveStatus(status: SaveStatus): string {
  if (status === "saving") return "Speichert";
  if (status === "saved") return "Gespeichert";
  if (status === "error") return "Fehler";
  return "Bereit";
}

function toolLabel(tool: ToolType): string {
  const labels: Record<ToolType, string> = {
    add_escape_route: "Fluchtweg hinzufügen",
    add_exit: "Ausgang hinzufügen",
    add_foh: "FOH hinzufügen",
    add_no_seat_zone: "Sperrfläche hinzufügen",
    add_seating_area: "Bestuhlungsbereich",
    add_seating_block: "Stuhlblock hinzufügen",
    add_stage: "Bühne hinzufügen",
    add_table: "Tisch hinzufügen",
    add_table_area: "Tischbereich",
    add_table_group: "Tischgruppe",
    delete_object: "Objekt löschen",
    draw_room: "Raum zeichnen",
    export_pdf: "PDF Export",
    generate_layouts: "Layouts generieren",
    generate_table_layout: "Tischlayout",
    recalculate_seating: "Bestuhlung",
    select: "Auswahl"
  };
  return labels[tool];
}
