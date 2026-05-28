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
import { ObjectListPanel } from "../object-list/ObjectListPanel";

export function AppShell({ initialPlan }: { initialPlan: Plan }) {
  const [state, dispatch] = useReducer(editorReducer, initialPlan, createInitialEditorState);
  const [notice, setNotice] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [centerTarget, setCenterTarget] = useState<{ id: string; nonce: number } | null>(null);

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
      if (isEditableTarget(event.target)) {
        return;
      }
      const selectedObjectIds = state.selectedObjectIds;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedObjectIds.length > 0) {
        event.preventDefault();
        dispatch({ type: "DELETE_OBJECTS", objectIds: selectedObjectIds });
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        dispatch({ type: "SET_SELECTED_OBJECTS", objectIds: getSelectableObjectIds(state.currentPlan) });
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        dispatch({ type: "DUPLICATE_SELECTION" });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        setFitRequest((value) => value + 1);
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.1 });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.1 });
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
  }, [state.currentPlan, state.selectedObjectId, state.selectedObjectIds, state.zoom]);

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

  async function generateAllLayouts() {
    await runPlanRequest<{ plan: Plan; validationResults: ValidationResult }>("/api/generate-layouts", "Alle Bereiche werden neu generiert...", (result) => {
      dispatch({ type: "SET_PLAN", plan: result.plan });
      dispatch({ type: "SET_DIRTY", dirty: true });
      dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: result.validationResults });
      dispatch({ type: "SET_LAST_CALCULATION_AT", lastCalculationAt: new Date().toISOString() });
      setNotice("Alle Layoutbereiche wurden neu generiert.");
    });
  }

  async function generateSelectedArea(objectId: string) {
    const object = state.currentPlan.objects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }
    if (object.role === "seating_area") {
      await runPlanRequest<Plan>(
        "/api/generate-seating",
        "Bestuhlungsbereich wird generiert...",
        (plan) => {
          dispatch({ type: "SET_PLAN", plan });
          dispatch({ type: "SET_DIRTY", dirty: true });
          if (plan.validationResult) {
            dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: plan.validationResult });
          }
          setNotice("Bestuhlungsbereich wurde generiert.");
        },
        { payload: { plan: state.currentPlan, options: { areaIds: [objectId] } } }
      );
      return;
    }
    if (object.role === "table_area") {
      await runPlanRequest<Plan>(
        "/api/generate-table-layout",
        "Tischbereich wird generiert...",
        (plan) => {
          dispatch({ type: "SET_PLAN", plan });
          dispatch({ type: "SET_DIRTY", dirty: true });
          if (plan.validationResult) {
            dispatch({ type: "SET_VALIDATION_RESULTS", validationResults: plan.validationResult });
          }
          setNotice("Tischbereich wurde generiert.");
        },
        { payload: { plan: state.currentPlan, options: { areaIds: [objectId] } } }
      );
    }
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

  async function runPlanRequest<T>(
    url: string,
    pendingMessage: string,
    onSuccess: (result: T) => void,
    options: { silent?: boolean; onError?: () => void; payload?: unknown } = {}
  ) {
    if (!options.silent) {
      setNotice(pendingMessage);
    }
    try {
      const response = await fetch(url, {
        body: JSON.stringify(options.payload ?? state.currentPlan),
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
    if (tool === "generate_layouts") {
      void generateAllLayouts();
      return;
    }
    dispatch({ type: "SET_ACTIVE_TOOL", tool });
    if (tool === "delete_object" && state.selectedObjectIds.length > 0) {
      dispatch({ type: "DELETE_OBJECTS", objectIds: state.selectedObjectIds });
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

  function selectObject(objectId?: string, additive = false) {
    if (!objectId) {
      dispatch({ type: "CLEAR_SELECTION" });
      return;
    }
    const selected = state.selectedObjectIds.includes(objectId);
    if (additive && selected) {
      dispatch({ type: "REMOVE_FROM_SELECTION", objectId });
      return;
    }
    if (additive) {
      dispatch({ type: "ADD_TO_SELECTION", objectId });
      return;
    }
    dispatch({ type: "SELECT_OBJECT", objectId });
  }

  function centerObjectInViewport(objectId: string) {
    setCenterTarget({ id: objectId, nonce: Date.now() });
    dispatch({ type: "HIGHLIGHT_OBJECT", objectId });
    window.setTimeout(() => dispatch({ type: "HIGHLIGHT_OBJECT", objectId: undefined }), 900);
  }

  const projectName = String(state.currentPlan.metadata.projectName ?? (state.currentPlan.projectId === "project-demo" ? "Sommerkonzert 2026" : state.currentPlan.projectId));
  const selectedObjectIds = state.selectedObjectIds;
  const lockedSelection = selectedObjectIds.some((id) => isSelectedEntityLocked(state.currentPlan, id));

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
          gridSizeMm={state.gridSizeMm}
          layers={layers}
          onExportPdf={exportPdf}
          onGenerateLayouts={generateAllLayouts}
          onGenerateTables={generateTables}
          onRecalculate={recalculateSeating}
          onSetGridSize={(gridSizeMm) => dispatch({ type: "SET_GRID_SIZE", gridSizeMm })}
          onSetSnapToGrid={(snapToGrid) => dispatch({ type: "SET_SNAP_TO_GRID", snapToGrid })}
          onToggleObjectList={() => dispatch({ type: "SET_SHOW_OBJECT_LIST", showObjectList: !state.showObjectList })}
          onToggleLayer={(layer) => dispatch({ type: "TOGGLE_LAYER", layer })}
          onToolChange={handleToolChange}
          showObjectList={state.showObjectList}
          snapToGrid={state.snapToGrid}
        />
        <div className="workspace">
          <PlannerCanvas
            activeTool={state.activeTool}
            centerTarget={centerTarget}
            fitRequest={fitRequest}
            gridSizeMm={state.gridSizeMm}
            layers={layers}
            onAddAtPoint={addAtPoint}
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
            onInteractionChange={(flags) => dispatch({ type: "SET_INTERACTION_FLAGS", ...flags })}
            onMove={(ids, dxMm, dyMm) => dispatch({ type: "MOVE_OBJECTS", objectIds: ids, dxMm, dyMm })}
            onResize={(id, widthMm, heightMm) => {
              const action = {
                type: "RESIZE_OBJECT" as const,
                objectId: id,
                ...(widthMm === undefined ? {} : { widthMm }),
                ...(heightMm === undefined ? {} : { heightMm })
              };
              dispatch(action);
            }}
            onSelect={(objectId, objectType, additive) => {
              if (!objectId) {
                dispatch({ type: "CLEAR_SELECTION" });
                return;
              }
              const selected = state.selectedObjectIds.includes(objectId);
              if (additive && selected) {
                dispatch({ type: "REMOVE_FROM_SELECTION", objectId });
                return;
              }
              if (additive) {
                dispatch({ type: "ADD_TO_SELECTION", objectId, ...(objectType ? { objectType } : {}) });
                return;
              }
              dispatch({ type: "SELECT_OBJECT", objectId, ...(objectType ? { objectType } : {}) });
            }}
            onSetSelectedObjects={(objectIds) => dispatch({ type: "SET_SELECTED_OBJECTS", objectIds })}
            onSetSelectionBox={(selectionBox) => dispatch({ type: "SET_SELECTION_BOX", selectionBox })}
            onSetTransientHint={(transientHint) => dispatch({ type: "SET_TRANSIENT_HINT", transientHint })}
            onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
            plan={state.currentPlan}
            recentlyHighlightedObjectId={state.recentlyHighlightedObjectId}
            selectedObjectId={state.selectedObjectId}
            selectedObjectIds={state.selectedObjectIds}
            selectionBox={state.selectionBox}
            snapToGrid={state.snapToGrid}
            transientHint={state.transientHint}
            validationResults={state.validationResults}
            zoom={state.zoom}
          />
          <StatusBar activeTool={state.activeTool} gridSizeMm={state.gridSizeMm} lastCalculationIso={state.lastCalculationAt ?? state.lastCalculationIso} lockedSelection={lockedSelection} plan={state.currentPlan} saveStatus={state.saveStatus} selectedCount={selectedObjectIds.length} snapToGrid={state.snapToGrid} validationResults={state.validationResults} zoom={state.zoom} />
          {notice ? <div className="toast-status">{notice}</div> : null}
        </div>
        <aside className="right-sidebar" aria-label="Eigenschaften und Validierung">
          {state.showObjectList ? (
            <ObjectListPanel
              onCenterObject={centerObjectInViewport}
              onSelectObject={(objectId, additive) => selectObject(objectId, additive)}
              onSetVisible={(objectIds, visible) => dispatch({ type: "SET_OBJECTS_VISIBLE", objectIds, visible })}
              onToggleLock={(objectIds, locked) => dispatch(locked ? { type: "LOCK_OBJECTS", objectIds } : { type: "UNLOCK_OBJECTS", objectIds })}
              plan={state.currentPlan}
              selectedObjectIds={state.selectedObjectIds}
            />
          ) : null}
          <PropertiesPanel
            onDelete={(id) => dispatch({ type: "DELETE_OBJECT", objectId: id })}
            onDeleteMany={(objectIds) => dispatch({ type: "DELETE_OBJECTS", objectIds })}
            onDuplicate={() => dispatch({ type: "DUPLICATE_SELECTION" })}
            onGenerateAll={generateAllLayouts}
            onGenerateForSelected={generateSelectedArea}
            onLock={(objectIds) => dispatch({ type: "LOCK_OBJECTS", objectIds })}
            onSelectNone={() => dispatch({ type: "CLEAR_SELECTION" })}
            onSetVisible={(objectIds, visible) => dispatch({ type: "SET_OBJECTS_VISIBLE", objectIds, visible })}
            onUnlock={(objectIds) => dispatch({ type: "UNLOCK_OBJECTS", objectIds })}
            onUpdateObject={updateObject}
            onUpdateObjectRect={updateObjectRectValue}
            onUpdateTable={(tableId, changes) => dispatch({ type: "UPDATE_TABLE", tableId, changes })}
            plan={state.currentPlan}
            selectedObjectId={state.selectedObjectId}
            selectedObjectIds={state.selectedObjectIds}
          />
          <ValidationPanel onSelectObject={(objectId) => {
            dispatch({ type: "SELECT_OBJECT", objectId });
            centerObjectInViewport(objectId);
          }} onValidate={validateCurrentPlan} validationResults={state.validationResults} />
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
    add_seating_area: { role: "seating_area", name: "Bestuhlungsbereich", width: 12000, height: 8000 },
    add_seating_block: { role: "seating_block", name: "Stuhlblock", width: 6000, height: 4000 },
    add_table_area: { role: "table_area", name: "Tischbereich", width: 12000, height: 7000 }
  };
  const spec = specs[tool];
  if (!spec) {
    return null;
  }
  const properties = defaultObjectProperties(spec.role);
  return {
    id: `${spec.role}-${Date.now()}`,
    type: "rect",
    role: spec.role,
    name: spec.name,
    rotationDeg: 0,
    visible: true,
    ...(properties ? { properties } : {}),
    geometry: { kind: "rect", rect: { x: point.x, y: point.y, width: spec.width, height: spec.height } }
  };
}

function defaultObjectProperties(role: DrawingObject["role"]): Record<string, unknown> | undefined {
  if (role === "seating_area") {
    return {
      orientationDeg: 0,
      chairWidthMm: 500,
      chairDepthMm: 520,
      rowPitchMm: 1420,
      targetSeatCount: 120,
      generateMode: "target",
      centerAisleMm: 1200,
      crossAisleEveryRows: 6,
      blockNamePrefix: "Neu"
    };
  }
  if (role === "table_area") {
    return {
      tableLayoutType: "rounds",
      tableType: "round",
      targetSeats: 64,
      seatsPerTable: 8,
      tableDiameterMm: 1800,
      tableWidthMm: 2200,
      tableDepthMm: 900,
      tableSpacingMm: 1200,
      chairDistanceMm: 320,
      orientationDeg: 0
    };
  }
  return undefined;
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

function getSelectableObjectIds(plan: Plan): string[] {
  const objectIds = plan.objects.filter((object) => object.visible !== false && object.locked !== true).map((object) => object.id);
  const tableIds = plan.tables.filter((table) => table.visible !== false && table.locked !== true).map((table) => table.id);
  const groupIds = plan.tableGroups.filter((group) => group.visible !== false && group.locked !== true).map((group) => group.id);
  return [...objectIds, ...tableIds, ...groupIds];
}

function isSelectedEntityLocked(plan: Plan, id: string): boolean {
  if (plan.room.id === id) {
    return true;
  }
  const object = plan.objects.find((item) => item.id === id);
  if (object) {
    return object.locked === true;
  }
  const table = plan.tables.find((item) => item.id === id);
  if (table) {
    return table.locked === true;
  }
  const group = plan.tableGroups.find((item) => item.id === id);
  return group?.locked === true;
}
