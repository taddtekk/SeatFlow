import type { DrawingObject, EditorHistoryEntry, EditorState, Plan, PlanAction, Rect, Table, TableSeat, ValidationResult } from "@seatflow/types";

const layerKeys = ["showChairs", "showTables", "showEscapeRoutes", "showNoSeatZones", "showGrid", "showMeasurements", "showValidation"] as const;
const maxHistoryLength = 40;

export function createInitialEditorState(plan: Plan): EditorState {
  const selectedObjectId = plan.objects.find((object) => object.role === "stage")?.id;
  const state: EditorState = {
    currentPlan: plan,
    activeTool: "select",
    validationResults: plan.validationResult ?? { valid: true, messages: [] },
    showChairs: true,
    showTables: true,
    showEscapeRoutes: true,
    showNoSeatZones: true,
    showGrid: true,
    showMeasurements: true,
    showValidation: true,
    dirtyState: false,
    zoom: 1,
    lastCalculationIso: plan.updatedAtIso,
    undoStack: [],
    redoStack: []
  };
  return selectedObjectId ? { ...state, selectedObjectId } : state;
}

export function editorReducer(state: EditorState, action: PlanAction): EditorState {
  switch (action.type) {
    case "SET_PLAN":
      return {
        ...state,
        currentPlan: action.plan,
        validationResults: action.plan.validationResult ?? state.validationResults,
        dirtyState: false,
        lastCalculationIso: action.plan.updatedAtIso,
        undoStack: [],
        redoStack: []
      };
    case "UNDO":
      return undo(state);
    case "REDO":
      return redo(state);
    case "SELECT_OBJECT":
      if (action.objectId) {
        return { ...state, selectedObjectId: action.objectId };
      }
      return withoutSelection(state);
    case "SET_ACTIVE_TOOL":
      return {
        ...state,
        activeTool: action.tool
      };
    case "UPDATE_ROOM":
      return withHistory(state, {
        ...state,
        selectedObjectId: action.room.id,
        activeTool: "select",
        currentPlan: {
          ...state.currentPlan,
          room: action.room,
          updatedAtIso: new Date().toISOString()
        }
      });
    case "ADD_OBJECT":
      return withHistory(state, {
        ...state,
        activeTool: "select",
        selectedObjectId: action.object.id,
        currentPlan: {
          ...state.currentPlan,
          objects: [...state.currentPlan.objects, action.object],
          updatedAtIso: new Date().toISOString()
        }
      });
    case "ADD_TABLE":
      return withHistory(state, {
        ...state,
        activeTool: "select",
        selectedObjectId: action.table.id,
        currentPlan: {
          ...state.currentPlan,
          tables: [...state.currentPlan.tables, action.table],
          tableSeats: [...state.currentPlan.tableSeats, ...action.tableSeats],
          updatedAtIso: new Date().toISOString()
        }
      });
    case "ADD_TABLE_GROUP":
      return withHistory(state, {
        ...state,
        activeTool: "select",
        selectedObjectId: action.tableGroup.id,
        currentPlan: {
          ...state.currentPlan,
          tableGroups: [...state.currentPlan.tableGroups, action.tableGroup],
          tables: [...state.currentPlan.tables, ...action.tables],
          tableSeats: [...state.currentPlan.tableSeats, ...action.tableSeats],
          updatedAtIso: new Date().toISOString()
        }
      });
    case "UPDATE_OBJECT":
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          objects: state.currentPlan.objects.map((object) => (object.id === action.objectId ? { ...object, ...action.changes } : object)),
          updatedAtIso: new Date().toISOString()
        }
      });
    case "UPDATE_TABLE":
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          tables: state.currentPlan.tables.map((table) => (table.id === action.tableId ? { ...table, ...action.changes } : table)),
          updatedAtIso: new Date().toISOString()
        }
      });
    case "DELETE_OBJECT":
      return withHistory(state, deleteEntity(state, action.objectId));
    case "MOVE_OBJECT":
      return withHistory(state, moveEntity(state, action.objectId, action.dxMm, action.dyMm));
    case "RESIZE_OBJECT":
      return withHistory(state, resizeEntity(state, action.objectId, action.widthMm, action.heightMm));
    case "SET_CHAIRS":
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          chairs: action.chairs,
          seatingBlocks: action.seatingBlocks,
          updatedAtIso: new Date().toISOString()
        },
        lastCalculationIso: new Date().toISOString()
      });
    case "SET_TABLES":
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          tables: action.tables,
          tableGroups: action.tableGroups,
          tableSeats: action.tableSeats,
          updatedAtIso: new Date().toISOString()
        },
        lastCalculationIso: new Date().toISOString()
      });
    case "SET_VALIDATION_RESULTS":
      return {
        ...state,
        validationResults: action.validationResults,
        currentPlan: {
          ...state.currentPlan,
          validationResult: action.validationResults
        }
      };
    case "SET_DIRTY":
      return {
        ...state,
        dirtyState: action.dirty
      };
    case "TOGGLE_LAYER":
      if (!layerKeys.includes(action.layer)) {
        return state;
      }
      return {
        ...state,
        [action.layer]: action.value ?? !state[action.layer]
      };
    case "SET_ZOOM":
      return {
        ...state,
        zoom: Math.max(0.5, Math.min(2, action.zoom))
      };
    default:
      return state;
  }
}

export function withValidation(state: EditorState, validationResults: ValidationResult): EditorState {
  return {
    ...state,
    validationResults,
    currentPlan: {
      ...state.currentPlan,
      validationResult: validationResults
    }
  };
}

function markDirty(state: EditorState): EditorState {
  return {
    ...state,
    dirtyState: true
  };
}

function withHistory(previous: EditorState, next: EditorState): EditorState {
  return {
    ...next,
    dirtyState: true,
    undoStack: [...previous.undoStack.slice(-(maxHistoryLength - 1)), createHistoryEntry(previous)],
    redoStack: []
  };
}

function undo(state: EditorState): EditorState {
  const previous = state.undoStack.at(-1);
  if (!previous) {
    return state;
  }
  const nextUndoStack = state.undoStack.slice(0, -1);
  return applyHistoryEntry(state, previous, nextUndoStack, [...state.redoStack, createHistoryEntry(state)]);
}

function redo(state: EditorState): EditorState {
  const next = state.redoStack.at(-1);
  if (!next) {
    return state;
  }
  const nextRedoStack = state.redoStack.slice(0, -1);
  return applyHistoryEntry(state, next, [...state.undoStack, createHistoryEntry(state)], nextRedoStack);
}

function createHistoryEntry(state: EditorState): EditorHistoryEntry {
  const entry: EditorHistoryEntry = { plan: state.currentPlan };
  return state.selectedObjectId ? { ...entry, selectedObjectId: state.selectedObjectId } : entry;
}

function applyHistoryEntry(state: EditorState, entry: EditorHistoryEntry, undoStack: EditorHistoryEntry[], redoStack: EditorHistoryEntry[]): EditorState {
  const next: EditorState = {
    ...state,
    currentPlan: entry.plan,
    validationResults: entry.plan.validationResult ?? state.validationResults,
    dirtyState: true,
    undoStack,
    redoStack
  };
  return entry.selectedObjectId ? { ...next, selectedObjectId: entry.selectedObjectId } : withoutSelection(next);
}

function deleteEntity(state: EditorState, id: string): EditorState {
  const group = state.currentPlan.tableGroups.find((tableGroup) => tableGroup.id === id);
  const tableIdsToDelete = new Set(group ? group.tableIds : [id]);

  return withoutSelection({
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.filter((object) => object.id !== id),
      tableGroups: state.currentPlan.tableGroups.filter((tableGroup) => tableGroup.id !== id),
      tables: state.currentPlan.tables.filter((table) => !tableIdsToDelete.has(table.id)),
      tableSeats: state.currentPlan.tableSeats.filter((seat) => !tableIdsToDelete.has(seat.tableId)),
      updatedAtIso: new Date().toISOString()
    }
  });
}

function withoutSelection(state: EditorState): EditorState {
  const { selectedObjectId: _selectedObjectId, ...rest } = state;
  return rest;
}

function moveEntity(state: EditorState, id: string, dxMm: number, dyMm: number): EditorState {
  const group = state.currentPlan.tableGroups.find((tableGroup) => tableGroup.id === id);
  const groupTableIds = new Set(group?.tableIds ?? []);
  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.map((object) => (object.id === id ? moveObject(object, dxMm, dyMm) : object)),
      tables: state.currentPlan.tables.map((table) => (table.id === id || groupTableIds.has(table.id) ? moveTable(table, dxMm, dyMm) : table)),
      tableSeats: state.currentPlan.tableSeats.map((seat) =>
        seat.tableId === id || groupTableIds.has(seat.tableId)
          ? { ...seat, position: { x: seat.position.x + dxMm, y: seat.position.y + dyMm } }
          : seat
      ),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function resizeEntity(state: EditorState, id: string, widthMm?: number, heightMm?: number): EditorState {
  const group = state.currentPlan.tableGroups.find((tableGroup) => tableGroup.id === id);
  if (group) {
    return resizeTableGroup(state, group.tableIds, widthMm, heightMm);
  }

  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.map((object) => (object.id === id ? resizeObject(object, widthMm, heightMm) : object)),
      tables: state.currentPlan.tables.map((table) =>
        table.id === id
          ? {
              ...table,
              widthMm: widthMm ?? table.widthMm,
              depthMm: heightMm ?? table.depthMm,
              ...(table.type === "round" ? { diameterMm: Math.max(widthMm ?? table.widthMm, heightMm ?? table.depthMm) } : {})
            }
          : table
      ),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function resizeTableGroup(state: EditorState, tableIds: string[], widthMm?: number, heightMm?: number): EditorState {
  const tableIdSet = new Set(tableIds);
  const groupTables = state.currentPlan.tables.filter((table) => tableIdSet.has(table.id));
  const groupRect = getGroupRect(groupTables);
  if (!groupRect) {
    return state;
  }
  const nextWidth = widthMm ?? groupRect.width;
  const nextHeight = heightMm ?? groupRect.height;
  const scaleX = nextWidth / groupRect.width;
  const scaleY = nextHeight / groupRect.height;

  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      tables: state.currentPlan.tables.map((table) => (tableIdSet.has(table.id) ? scaleTable(table, groupRect, scaleX, scaleY) : table)),
      tableSeats: state.currentPlan.tableSeats.map((seat) => (tableIdSet.has(seat.tableId) ? scaleSeat(seat, groupRect, scaleX, scaleY) : seat)),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function moveObject(object: DrawingObject, dxMm: number, dyMm: number): DrawingObject {
  if (object.geometry.kind !== "rect") {
    return object;
  }
  return {
    ...object,
    geometry: {
      ...object.geometry,
      rect: {
        ...object.geometry.rect,
        x: object.geometry.rect.x + dxMm,
        y: object.geometry.rect.y + dyMm
      }
    }
  };
}

function resizeObject(object: DrawingObject, widthMm?: number, heightMm?: number): DrawingObject {
  if (object.geometry.kind !== "rect") {
    return object;
  }
  return {
    ...object,
    geometry: {
      ...object.geometry,
      rect: {
        ...object.geometry.rect,
        width: widthMm ?? object.geometry.rect.width,
        height: heightMm ?? object.geometry.rect.height
      }
    }
  };
}

function moveTable(table: Table, dxMm: number, dyMm: number): Table {
  return {
    ...table,
    position: {
      x: table.position.x + dxMm,
      y: table.position.y + dyMm
    }
  };
}

function scaleTable(table: Table, origin: Rect, scaleX: number, scaleY: number): Table {
  const widthMm = Math.max(600, table.widthMm * scaleX);
  const depthMm = Math.max(600, table.depthMm * scaleY);
  return {
    ...table,
    position: {
      x: origin.x + (table.position.x - origin.x) * scaleX,
      y: origin.y + (table.position.y - origin.y) * scaleY
    },
    widthMm,
    depthMm,
    ...(table.type === "round" ? { diameterMm: Math.max(widthMm, depthMm) } : {})
  };
}

function scaleSeat(seat: TableSeat, origin: Rect, scaleX: number, scaleY: number): TableSeat {
  return {
    ...seat,
    position: {
      x: origin.x + (seat.position.x - origin.x) * scaleX,
      y: origin.y + (seat.position.y - origin.y) * scaleY
    }
  };
}

function getGroupRect(tables: Table[]): Rect | null {
  if (tables.length === 0) {
    return null;
  }
  const rects = tables.map(tableToRect);
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX - 500, y: minY - 500, width: maxX - minX + 1000, height: maxY - minY + 1000 };
}

function tableToRect(table: Table): Rect {
  return {
    x: table.position.x,
    y: table.position.y,
    width: table.diameterMm ?? table.widthMm,
    height: table.diameterMm ?? table.depthMm
  };
}

export function updateObjectRect(object: DrawingObject, rect: Rect): DrawingObject {
  if (object.geometry.kind !== "rect") {
    return object;
  }
  return {
    ...object,
    geometry: {
      ...object.geometry,
      rect
    }
  };
}
