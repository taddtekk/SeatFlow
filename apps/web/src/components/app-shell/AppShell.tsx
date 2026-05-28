"use client";

import type { DrawingObject, Plan, Point, Rect, Table, TableGroup, TableSeat, ToolType, ValidationResult } from "@seatflow/types";
import { useEffect, useReducer, useState } from "react";
import { updateObjectRect, createInitialEditorState, editorReducer } from "../../lib/editor-state";
import { PlannerCanvas } from "../planner-canvas/PlannerCanvas";
import { PropertiesPanel } from "../properties-panel/PropertiesPanel";
import { StatusBar } from "../status-bar/StatusBar";
import { ToolSidebar } from "../tool-sidebar/ToolSidebar";
import { TopBar } from "../top-bar/TopBar";
import { ValidationPanel } from "../validation/ValidationPanel";

export function AppShell({ initialPlan }: { initialPlan: Plan }) {
  const [state, dispatch] = useReducer(editorReducer, initialPlan, createInitialEditorState);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const localDraft = loadLocalDraft(initialPlan.id);
    if (localDraft) {
      dispatch({ type: "SET_PLAN", plan: localDraft });
      dispatch({ type: "SET_DIRTY", dirty: true });
      setNotice("Lokaler Entwurf wurde wiederhergestellt.");
      return () => {
        active = false;
      };
    }
    fetch("/api/demo-plan")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Demo-Plan nicht erreichbar"))))
      .then((plan: Plan) => {
        if (active) {
          dispatch({ type: "SET_PLAN", plan });
        }
      })
      .catch(() => {
        setNotice("Demo-Plan aus lokalem Fallback geladen.");
      });
    return () => {
      active = false;
    };
  }, [initialPlan.id]);

  useEffect(() => {
    if (state.dirtyState) {
      saveLocalDraft(state.currentPlan);
    }
  }, [state.currentPlan, state.dirtyState]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) && (event.key === "Delete" || event.key === "Backspace" || event.key === "Escape")) {
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedObjectId) {
        event.preventDefault();
        dispatch({ type: "DELETE_OBJECT", objectId: state.selectedObjectId });
      }
      if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "CLEAR_SELECTION" });
        dispatch({ type: "SET_ACTIVE_TOOL", tool: "select" });
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void savePlan();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        void exportPdf();
      }
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo = ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z");
      if (isUndo) {
        event.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (isRedo) {
        event.preventDefault();
        dispatch({ type: "REDO" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.currentPlan, state.selectedObjectId]);

  useEffect(() => {
    if (!state.dirtyState) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void validateCurrentPlan(false);
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [state.currentPlan.updatedAtIso, state.dirtyState]);

  const layers = {
    showChairs: state.showChairs,
    showTables: state.showTables,
    showEscapeRoutes: state.showEscapeRoutes,
    showNoSeatZones: state.showNoSeatZones,
    showGrid: state.showGrid,
    showMeasurements: state.showMeasurements,
    showValidation: state.showValidation
  };

  async function recalculateSeating() {
    await runPlanRequest<Plan>("/api/generate-seating", "Bestuhlung wird neu berechnet...", (plan) => {
      dispatch({ type: "SET_PLAN", plan });
      dispatch({ type: "SET_DIRTY", dirty: true });
      dispatch({ type: "SET_LAST_CALCULATION_AT", lastCalculationAt: new Date().toISOString() });
      if (plan.validationResult) {
        dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: plan.validationResult });
      }
      setNotice("Bestuhlung wurde neu berechnet.");
    });
  }

  async function generateTables() {
    await runPlanRequest<Plan>("/api/generate-table-layout", "Tischlayout wird erzeugt...", (plan) => {
      dispatch({ type: "SET_PLAN", plan });
      dispatch({ type: "SET_DIRTY", dirty: true });
      if (plan.validationResult) {
        dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: plan.validationResult });
      }
      setNotice("Tischlayout wurde erzeugt.");
    });
  }

  async function validateCurrentPlan(showNotice = true) {
    await runPlanRequest<ValidationResult>("/api/validate-plan", "Validierung wird geprüft...", (validationResults) => {
      dispatch({ type: "SET_VALIDATION_RESULTS", validationResults });
      if (showNotice) {
        setNotice("Validierung wurde erneut geprüft.");
      }
    }, { silent: !showNotice });
  }

  async function exportPdf() {
    dispatch({ type: "SET_EXPORT_STATUS", exportStatus: "exporting" });
    await runPlanRequest<{ url: string }>("/api/export/pdf", "PDF-Export wird vorbereitet...", (result) => {
      dispatch({ type: "SET_EXPORT_STATUS", exportStatus: "exported" });
      setNotice(`PDF exportiert: ${result.url}`);
    }, {
      onError: () => dispatch({ type: "SET_EXPORT_STATUS", exportStatus: "error" })
    });
  }

  async function savePlan() {
    dispatch({ type: "SET_SAVE_STATUS", saveStatus: "saving" });
    setNotice("Plan wird gespeichert...");
    try {
      const response = await fetch(`/api/plans/${state.currentPlan.id}`, {
        body: JSON.stringify(state.currentPlan),
        headers: { "Content-Type": "application/json" },
        method: "PUT"
      });
      if (!response.ok) {
        throw new Error("Speichern fehlgeschlagen");
      }
      const plan = (await response.json()) as Plan;
      dispatch({ type: "SET_PLAN", plan });
      dispatch({ type: "SET_DIRTY", dirty: false });
      dispatch({ type: "SET_SAVE_STATUS", saveStatus: "saved" });
      clearLocalDraft(plan.id);
      setNotice("Plan wurde im InMemory-Repository gespeichert.");
    } catch {
      dispatch({ type: "SET_SAVE_STATUS", saveStatus: "error" });
      setNotice("Plan konnte nicht gespeichert werden.");
    }
  }

  async function runPlanRequest<T>(url: string, pendingMessage: string, onSuccess: (result: T) => void, options: { silent?: boolean; onError?: () => void } = {}) {
    if (!options.silent) {
      setNotice(pendingMessage);
    }
    try {
      const response = await fetch(url, {
        body: JSON.stringify(state.currentPlan),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(`${url} fehlgeschlagen`);
      }
      onSuccess((await response.json()) as T);
    } catch {
      options.onError?.();
      if (!options.silent) {
        setNotice("Aktion konnte nicht abgeschlossen werden.");
      }
    }
  }

  function handleToolChange(tool: ToolType) {
    if (tool === "recalculate_seating") {
      void recalculateSeating();
      return;
    }
    if (tool === "export_pdf") {
      void exportPdf();
      return;
    }
    if (tool === "generate_table_layout") {
      void generateTables();
      return;
    }
    dispatch({ type: "SET_ACTIVE_TOOL", tool });
    if (tool === "delete_object" && state.selectedObjectId) {
      dispatch({ type: "DELETE_OBJECT", objectId: state.selectedObjectId });
    }
  }

  function addAtPoint(point: Point) {
    const tool = state.activeTool;
    if (tool === "add_table") {
      const table = createTable(point);
      dispatch({ type: "ADD_TABLE", table, tableSeats: createTableSeats(table) });
      return;
    }
    if (tool === "add_table_group") {
      const group = createTableGroup(point);
      dispatch({ type: "ADD_TABLE_GROUP", tableGroup: group.tableGroup, tables: group.tables, tableSeats: group.tableSeats });
      return;
    }
    if (tool === "draw_room") {
      const room = updateObjectRect(state.currentPlan.room, { x: point.x, y: point.y, width: 18000, height: 12000 }) as Plan["room"];
      dispatch({ type: "UPDATE_ROOM", room });
      return;
    }
    const object = createObjectFromTool(tool, point);
    if (object) {
      dispatch({ type: "ADD_OBJECT", object });
    }
  }

  function updateObject(id: string, changes: Partial<DrawingObject>) {
    dispatch({ type: "UPDATE_OBJECT", objectId: id, changes });
  }

  function updateObjectRectValue(id: string, rect: Rect) {
    const object = [...state.currentPlan.objects, state.currentPlan.room].find((item) => item.id === id);
    if (!object) {
      return;
    }
    if (object.id === state.currentPlan.room.id) {
      dispatch({ type: "UPDATE_ROOM", room: updateObjectRect(object, rect) as Plan["room"] });
      return;
    }
    dispatch({ type: "UPDATE_OBJECT", objectId: id, changes: { geometry: updateObjectRect(object, rect).geometry } });
  }

  const projectName = String(state.currentPlan.metadata.projectName ?? (state.currentPlan.projectId === "project-demo" ? "Sommerkonzert 2026" : state.currentPlan.projectId));

  return (
    <main className="seatflow-app">
      <TopBar
        canRedo={state.redoStack.length > 0}
        canUndo={state.undoStack.length > 0}
        dirty={state.dirtyState}
        onExportPdf={exportPdf}
        onRecalculate={recalculateSeating}
        onRedo={() => dispatch({ type: "REDO" })}
        onSave={savePlan}
        onUndo={() => dispatch({ type: "UNDO" })}
        planName={state.currentPlan.name}
        projectName={projectName}
      />
      <div className="editor-shell">
        <ToolSidebar
          activeTool={state.activeTool}
          layers={layers}
          onExportPdf={exportPdf}
          onGenerateTables={generateTables}
          onRecalculate={recalculateSeating}
          onToggleLayer={(layer) => dispatch({ type: "TOGGLE_LAYER", layer })}
          onToolChange={handleToolChange}
        />
        <div className="workspace">
          <PlannerCanvas
            activeTool={state.activeTool}
            gridSizeMm={state.gridSizeMm}
            layers={layers}
            onAddAtPoint={addAtPoint}
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
            onInteractionChange={(flags) => dispatch({ type: "SET_INTERACTION_FLAGS", ...flags })}
            onMove={(id, dxMm, dyMm) => dispatch({ type: "MOVE_OBJECT", objectId: id, dxMm, dyMm })}
            onResize={(id, widthMm, heightMm) => {
              const action = {
                type: "RESIZE_OBJECT" as const,
                objectId: id,
                ...(widthMm === undefined ? {} : { widthMm }),
                ...(heightMm === undefined ? {} : { heightMm })
              };
              dispatch(action);
            }}
            onSelect={(objectId, objectType) => dispatch(objectId ? { type: "SELECT_OBJECT", objectId, ...(objectType ? { objectType } : {}) } : { type: "CLEAR_SELECTION" })}
            onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
            plan={state.currentPlan}
            selectedObjectId={state.selectedObjectId}
            snapToGrid={state.snapToGrid}
            validationResults={state.validationResults}
            zoom={state.zoom}
          />
          <StatusBar gridSizeMm={state.gridSizeMm} lastCalculationIso={state.lastCalculationAt ?? state.lastCalculationIso} plan={state.currentPlan} saveStatus={state.saveStatus} zoom={state.zoom} />
          {notice ? <div className="toast-status">{notice}</div> : null}
        </div>
        <aside className="right-sidebar" aria-label="Eigenschaften und Validierung">
          <PropertiesPanel
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
            onSelectNone={() => dispatch({ type: "CLEAR_SELECTION" })}
            onUpdateObject={updateObject}
            onUpdateObjectRect={updateObjectRectValue}
            onUpdateTable={(tableId, changes) => dispatch({ type: "UPDATE_TABLE", tableId, changes })}
            plan={state.currentPlan}
            selectedObjectId={state.selectedObjectId}
          />
          <ValidationPanel onValidate={validateCurrentPlan} validationResults={state.validationResults} />
        </aside>
      </div>
    </main>
  );
}

function createObjectFromTool(tool: ToolType, point: Point): DrawingObject | null {
  const specs: Partial<Record<ToolType, { role: DrawingObject["role"]; name: string; width: number; height: number }>> = {
    add_stage: { role: "stage", name: "Bühne", width: 8000, height: 4000 },
    add_foh: { role: "foh", name: "FOH", width: 6000, height: 3000 },
    add_no_seat_zone: { role: "no_seat_zone", name: "Sperrfläche", width: 4000, height: 3000 },
    add_escape_route: { role: "escape_route", name: "Fluchtweg", width: 8000, height: 2000 },
    add_exit: { role: "exit", name: "Ausgang", width: 800, height: 800 },
    add_seating_block: { role: "seating_block", name: "Stuhlblock", width: 6000, height: 4000 }
  };
  const spec = specs[tool];
  if (!spec) {
    return null;
  }
  return {
    id: `${spec.role}-${Date.now()}`,
    type: "rect",
    role: spec.role,
    name: spec.name,
    rotationDeg: 0,
    visible: true,
    geometry: { kind: "rect", rect: { x: point.x, y: point.y, width: spec.width, height: spec.height } }
  };
}

function createTable(point: Point, index = Date.now()): Table {
  return {
    id: `table-${index}`,
    type: "round",
    name: "Runder Tisch",
    x: point.x,
    y: point.y,
    position: point,
    widthMm: 1800,
    depthMm: 1800,
    diameterMm: 1800,
    rotationDeg: 0,
    seatCount: 8,
    seats: 8
  };
}

function createTableGroup(point: Point): { tableGroup: TableGroup; tables: Table[]; tableSeats: TableSeat[] } {
  const groupId = `table-group-${Date.now()}`;
  const tables = [0, 1, 2].map((index) => ({
    ...createTable({ x: point.x + index * 2600, y: point.y }, Date.now() + index),
    groupId,
    name: `Tischgruppe Tisch ${index + 1}`
  }));
  const tableSeats = tables.flatMap(createTableSeats);
  return {
    tableGroup: { id: groupId, name: "Tischgruppe", layoutType: "grid", tableIds: tables.map((table) => table.id), tables, seats: tableSeats },
    tables,
    tableSeats
  };
}

function createTableSeats(table: Table): TableSeat[] {
  const seatCount = table.seatCount ?? table.seats;
  const tableX = table.x ?? table.position.x;
  const tableY = table.y ?? table.position.y;
  const center = { x: tableX + table.widthMm / 2, y: tableY + table.depthMm / 2 };
  const radius = (table.diameterMm ?? table.widthMm) / 2 + 320;
  return Array.from({ length: seatCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / seatCount;
    const x = center.x + Math.cos(angle) * radius - 240;
    const y = center.y + Math.sin(angle) * radius - 240;
    return {
      id: `${table.id}-seat-${index + 1}`,
      tableId: table.id,
      x,
      y,
      position: { x, y },
      widthMm: 480,
      depthMm: 480,
      rotationDeg: (angle * 180) / Math.PI
    };
  });
}

function localDraftKey(planId: string): string {
  return `seatflow:planner:draft:${planId}`;
}

function loadLocalDraft(planId: string): Plan | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey(planId));
    return raw ? (JSON.parse(raw) as Plan) : null;
  } catch {
    return null;
  }
}

function saveLocalDraft(plan: Plan) {
  try {
    window.localStorage.setItem(localDraftKey(plan.id), JSON.stringify({ ...plan, metadata: { ...plan.metadata, localDraftAtIso: new Date().toISOString() } }));
  } catch {
    // LocalStorage ist nur ein Komfort-Fallback; der API-Speicher bleibt fuehrend.
  }
}

function clearLocalDraft(planId: string) {
  try {
    window.localStorage.removeItem(localDraftKey(planId));
  } catch {
    // Ignorieren, falls der Browser lokalen Speicher blockiert.
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}
