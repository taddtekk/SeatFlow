import type { Plan, SaveStatus } from "@seatflow/types";

export function StatusBar({
  gridSizeMm,
  lastCalculationIso,
  plan,
  saveStatus,
  zoom
}: {
  gridSizeMm: number;
  lastCalculationIso?: string | undefined;
  plan: Plan;
  saveStatus: SaveStatus;
  zoom: number;
}) {
  return (
    <footer className="statusbar">
      <span>Stühle gesamt: <strong>{plan.chairs.length}</strong></span>
      <span>Tische gesamt: <strong>{plan.tables.length}</strong></span>
      <span>Regelprofil: <strong>{plan.ruleProfile.name}</strong></span>
      <span>Stuhlbreite: <strong>{plan.ruleProfile.minSeatWidthMm} mm</strong></span>
      <span>Reihenabstand: <strong>{plan.ruleProfile.minRowClearanceMm} mm</strong></span>
      <span>Raster: <strong>{gridSizeMm} mm</strong></span>
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
