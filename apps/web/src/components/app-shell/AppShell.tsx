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
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedObjectId) {
        event.preventDefault();
        dispatch({ type: "DELETE_OBJECT", objectId: state.selectedObjectId });
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
  }, [state.selectedObjectId]);

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
      if (plan.validationResult) {
        dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: plan.validationResult });
      }
      setNotice("Bestuhlung wurde neu berechnet.");
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
    await runPlanRequest<{ url: string }>("/api/export/pdf", "PDF-Export wird vorbereitet...", (result) => {
      setNotice(`PDF exportiert: ${result.url}`);
    });
  }

  async function savePlan() {
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
      setNotice("Plan wurde im InMemory-Repository gespeichert.");
    } catch {
      setNotice("Plan konnte nicht gespeichert werden.");
    }
  }

  async function runPlanRequest<T>(url: string, pendingMessage: string, onSuccess: (result: T) => void, options: { silent?: boolean } = {}) {
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

  const projectName = state.currentPlan.projectId === "project-demo" ? "Sommerkonzert 2026" : state.currentPlan.projectId;

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
          onRecalculate={recalculateSeating}
          onToggleLayer={(layer) => dispatch({ type: "TOGGLE_LAYER", layer })}
          onToolChange={handleToolChange}
        />
        <div className="workspace">
          <PlannerCanvas
            activeTool={state.activeTool}
            layers={layers}
            onAddAtPoint={addAtPoint}
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
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
            onSelect={(objectId) => dispatch(objectId ? { type: "SELECT_OBJECT", objectId } : { type: "SELECT_OBJECT" })}
            onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
            plan={state.currentPlan}
            selectedObjectId={state.selectedObjectId}
            validationResults={state.validationResults}
            zoom={state.zoom}
          />
          <StatusBar lastCalculationIso={state.lastCalculationIso} plan={state.currentPlan} zoom={state.zoom} />
          {notice ? <div className="toast-status">{notice}</div> : null}
        </div>
        <aside className="right-sidebar" aria-label="Eigenschaften und Validierung">
          <PropertiesPanel
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
            onSelectNone={() => dispatch({ type: "SELECT_OBJECT" })}
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
    role: spec.role,
    name: spec.name,
    geometry: { kind: "rect", rect: { x: point.x, y: point.y, width: spec.width, height: spec.height } }
  };
}

function createTable(point: Point, index = Date.now()): Table {
  return {
    id: `table-${index}`,
    type: "round",
    name: "Runder Tisch",
    position: point,
    widthMm: 1800,
    depthMm: 1800,
    diameterMm: 1800,
    rotationDeg: 0,
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
  return {
    tableGroup: { id: groupId, name: "Tischgruppe", layoutType: "grid", tableIds: tables.map((table) => table.id) },
    tables,
    tableSeats: tables.flatMap(createTableSeats)
  };
}

function createTableSeats(table: Table): TableSeat[] {
  const center = { x: table.position.x + table.widthMm / 2, y: table.position.y + table.depthMm / 2 };
  const radius = (table.diameterMm ?? table.widthMm) / 2 + 320;
  return Array.from({ length: table.seats }, (_, index) => {
    const angle = (Math.PI * 2 * index) / table.seats;
    return {
      id: `${table.id}-seat-${index + 1}`,
      tableId: table.id,
      position: { x: center.x + Math.cos(angle) * radius - 240, y: center.y + Math.sin(angle) * radius - 240 },
      widthMm: 480,
      depthMm: 480,
      rotationDeg: (angle * 180) / Math.PI
    };
  });
}
