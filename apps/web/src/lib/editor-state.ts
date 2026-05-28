import type { DrawingObject, EditorState, Plan, PlanAction, Rect, Table, ValidationResult } from "@seatflow/types";

const layerKeys = ["showChairs", "showTables", "showEscapeRoutes", "showNoSeatZones", "showGrid", "showMeasurements", "showValidation"] as const;

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
    lastCalculationIso: plan.updatedAtIso
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
        lastCalculationIso: action.plan.updatedAtIso
      };
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
    case "ADD_OBJECT":
      return markDirty({
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
      return markDirty({
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
      return markDirty({
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
      return markDirty({
        ...state,
        currentPlan: {
          ...state.currentPlan,
          objects: state.currentPlan.objects.map((object) => (object.id === action.objectId ? { ...object, ...action.changes } : object)),
          updatedAtIso: new Date().toISOString()
        }
      });
    case "UPDATE_TABLE":
      return markDirty({
        ...state,
        currentPlan: {
          ...state.currentPlan,
          tables: state.currentPlan.tables.map((table) => (table.id === action.tableId ? { ...table, ...action.changes } : table)),
          updatedAtIso: new Date().toISOString()
        }
      });
    case "DELETE_OBJECT":
      return markDirty(deleteEntity(state, action.objectId));
    case "MOVE_OBJECT":
      return markDirty(moveEntity(state, action.objectId, action.dxMm, action.dyMm));
    case "RESIZE_OBJECT":
      return markDirty(resizeEntity(state, action.objectId, action.widthMm, action.heightMm));
    case "SET_CHAIRS":
      return markDirty({
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
      return markDirty({
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
