"use client";

import { objectToRect } from "@seatflow/geometry";
import type { DrawingObject, EditorState, Plan, ToolType } from "@seatflow/types";
import { useMemo, useState } from "react";

const tools: Array<{ id: ToolType; label: string }> = [
  { id: "select", label: "Auswahl" },
  { id: "draw_room", label: "Raum zeichnen" },
  { id: "add_stage", label: "Bühne hinzufügen" },
  { id: "add_foh", label: "FOH hinzufügen" },
  { id: "add_no_seat_zone", label: "Sperrfläche hinzufügen" },
  { id: "add_escape_route", label: "Fluchtweg hinzufügen" },
  { id: "add_exit", label: "Ausgang hinzufügen" },
  { id: "add_seating_block", label: "Stuhlblock hinzufügen" },
  { id: "add_table", label: "Tisch hinzufügen" },
  { id: "add_table_group", label: "Tischgruppe hinzufügen" },
  { id: "delete_object", label: "Objekt löschen" },
  { id: "recalculate_seating", label: "Bestuhlung neu berechnen" },
  { id: "export_pdf", label: "PDF exportieren" }
];

export function PlannerClient({ initialPlan }: { initialPlan: Plan }) {
  const selectedObjectId = initialPlan.objects[0]?.id;
  const initialState: EditorState = {
    plan: initialPlan,
    activeTool: "select",
    showChairs: true,
    showTables: true,
    showEscapeRoutes: true,
    showNoSeatZones: true,
    showGrid: true,
    showDimensions: true,
    showValidation: true,
    dirty: false
  };
  const [state, setState] = useState<EditorState>(
    selectedObjectId ? { ...initialState, selectedObjectId } : initialState
  );
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const selectedObject = state.plan.objects.find((object) => object.id === state.selectedObjectId);
  const validation = state.plan.validationResult;
  const roomRect = objectToRect(state.plan.room);

  async function recalculateSeating() {
    const response = await fetch("/api/generate-seating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.plan)
    });
    const nextPlan = (await response.json()) as Plan;
    setState((current) => ({ ...current, plan: nextPlan, dirty: true }));
  }

  async function exportPdf() {
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.plan)
    });
    const result = (await response.json()) as { url: string };
    setExportUrl(result.url);
  }

  function updateTool(tool: ToolType) {
    if (tool === "recalculate_seating") {
      void recalculateSeating();
      return;
    }
    if (tool === "export_pdf") {
      void exportPdf();
      return;
    }
    setState((current) => ({ ...current, activeTool: tool }));
  }

  const warningCount = validation?.messages.filter((message) => message.severity === "warning").length ?? 0;
  const errorCount = validation?.messages.filter((message) => message.severity === "error").length ?? 0;

  return (
    <main className="planner-shell">
      <header className="top-bar">
        <div>
          <strong>SeatFlow</strong>
          <span>Projekt: {state.plan.projectId}</span>
          <span>Plan: {state.plan.name}</span>
          <span>Status: {state.plan.status}</span>
        </div>
        <div className="top-actions">
          <button type="button" onClick={recalculateSeating}>Bestuhlung neu berechnen</button>
          <button type="button" onClick={exportPdf}>PDF exportieren</button>
          <button type="button" disabled>Speichern</button>
        </div>
      </header>

      <section className="planner-layout">
        <aside className="tool-panel">
          <h2>Werkzeuge</h2>
          {tools.map((tool) => (
            <button key={tool.id} className={state.activeTool === tool.id ? "active" : ""} type="button" onClick={() => updateTool(tool.id)}>
              {tool.label}
            </button>
          ))}
          <h2>Anzeige</h2>
          <Toggle label="Stühle anzeigen" checked={state.showChairs} onChange={(value) => setState((current) => ({ ...current, showChairs: value }))} />
          <Toggle label="Tische anzeigen" checked={state.showTables} onChange={(value) => setState((current) => ({ ...current, showTables: value }))} />
          <Toggle label="Fluchtwege anzeigen" checked={state.showEscapeRoutes} onChange={(value) => setState((current) => ({ ...current, showEscapeRoutes: value }))} />
          <Toggle label="Sperrflächen anzeigen" checked={state.showNoSeatZones} onChange={(value) => setState((current) => ({ ...current, showNoSeatZones: value }))} />
          <Toggle label="Raster anzeigen" checked={state.showGrid} onChange={(value) => setState((current) => ({ ...current, showGrid: value }))} />
          <Toggle label="Maße anzeigen" checked={state.showDimensions} onChange={(value) => setState((current) => ({ ...current, showDimensions: value }))} />
          <Toggle label="Validierung anzeigen" checked={state.showValidation} onChange={(value) => setState((current) => ({ ...current, showValidation: value }))} />
        </aside>

        <section className="canvas-panel">
          <svg className="plan-canvas" viewBox={`0 0 ${roomRect.width} ${roomRect.height}`} role="img" aria-label="SeatFlow Planfläche">
            <defs>
              <pattern id="grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
                <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#d6dde8" strokeWidth="45" />
              </pattern>
            </defs>
            {state.showGrid ? <rect width={roomRect.width} height={roomRect.height} fill="url(#grid)" /> : null}
            <rect className="room" x={0} y={0} width={roomRect.width} height={roomRect.height} />
            {state.plan.objects.map((object) => (
              <PlanObject
                key={object.id}
                object={object}
                selected={object.id === state.selectedObjectId}
                hidden={isHidden(object, state)}
                onSelect={() => setState((current) => ({ ...current, selectedObjectId: object.id }))}
              />
            ))}
            {state.showChairs
              ? state.plan.chairs.map((chair) => (
                  <rect key={chair.id} className="chair" x={chair.position.x} y={chair.position.y} width={chair.widthMm} height={chair.depthMm} />
                ))
              : null}
            {state.showTables
              ? state.plan.tables.map((table) => (
                  <g key={table.id}>
                    <rect className="table" x={table.position.x} y={table.position.y} width={table.diameterMm ?? table.widthMm} height={table.diameterMm ?? table.depthMm} />
                    <text className="small-label" x={table.position.x + 120} y={table.position.y + 420}>{table.name}</text>
                  </g>
                ))
              : null}
            {state.showTables
              ? state.plan.tableSeats.map((seat) => (
                  <rect key={seat.id} className="table-seat" x={seat.position.x} y={seat.position.y} width={seat.widthMm} height={seat.depthMm} />
                ))
              : null}
          </svg>
        </section>

        <aside className="side-panel">
          <h2>Eigenschaften</h2>
          {selectedObject ? <ObjectDetails object={selectedObject} /> : <p>Kein Objekt ausgewählt.</p>}
          <h2>Validierung</h2>
          <div className="metric-row">
            <span>Stühle</span><strong>{state.plan.chairs.length}</strong>
          </div>
          <div className="metric-row">
            <span>Tische</span><strong>{state.plan.tables.length}</strong>
          </div>
          <div className="metric-row">
            <span>Warnungen</span><strong>{warningCount}</strong>
          </div>
          <div className="metric-row">
            <span>Fehler</span><strong>{errorCount}</strong>
          </div>
          {state.showValidation ? (
            <ul className="message-list">
              {(validation?.messages ?? []).map((message) => (
                <li key={message.id} className={message.severity}>{message.message}</li>
              ))}
            </ul>
          ) : null}
          {exportUrl ? <p className="export-link">PDF: <a href={exportUrl}>{exportUrl}</a></p> : null}
          <p className="disclaimer">Diese Prüfung ersetzt keine behördliche oder brandschutztechnische Freigabe.</p>
        </aside>
      </section>
    </main>
  );
}

function PlanObject({ object, selected, hidden, onSelect }: { object: DrawingObject; selected: boolean; hidden: boolean; onSelect: () => void }) {
  const rect = objectToRect(object);
  if (hidden || object.role === "room") return null;
  return (
    <g onClick={onSelect}>
      <rect className={`object object-${object.role} ${selected ? "selected" : ""}`} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      <text className="object-label" x={rect.x + rect.width / 2} y={rect.y + rect.height / 2}>{object.name}</text>
    </g>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ObjectDetails({ object }: { object: DrawingObject }) {
  const rect = objectToRect(object);
  return (
    <dl className="details">
      <div><dt>Typ</dt><dd>{object.role}</dd></div>
      <div><dt>Name</dt><dd>{object.name}</dd></div>
      <div><dt>X</dt><dd>{Math.round(rect.x)} mm</dd></div>
      <div><dt>Y</dt><dd>{Math.round(rect.y)} mm</dd></div>
      <div><dt>Breite</dt><dd>{Math.round(rect.width)} mm</dd></div>
      <div><dt>Tiefe/Höhe</dt><dd>{Math.round(rect.height)} mm</dd></div>
      <div><dt>Rotation</dt><dd>0°</dd></div>
      <div><dt>Notiz</dt><dd>{object.note ?? "-"}</dd></div>
    </dl>
  );
}

function isHidden(object: DrawingObject, state: EditorState): boolean {
  if (object.role === "escape_route") return !state.showEscapeRoutes;
  if (["no_seat_zone", "stage", "foh", "stairs", "stage_access", "technical_area"].includes(object.role)) return !state.showNoSeatZones;
  return false;
}
