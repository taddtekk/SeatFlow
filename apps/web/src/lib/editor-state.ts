import type { DrawingObject, EditorHistoryEntry, EditorState, Plan, PlanAction, Rect, SelectedObjectType, Table, TableSeat, ValidationResult } from "@seatflow/types";

const layerKeys = ["showChairs", "showTables", "showEscapeRoutes", "showNoSeatZones", "showGrid", "showMeasurements", "showValidation"] as const;
const maxHistoryLength = 40;

export function createInitialEditorState(plan: Plan): EditorState {
  const selectedObjectId = plan.objects.find((object) => object.role === "stage")?.id;
  const state: EditorState = {
    currentPlan: plan,
    selectedObjectIds: selectedObjectId ? [selectedObjectId] : [],
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
    panOffset: { x: 0, y: 0 },
    selectionBox: null,
    gridSizeMm: 250,
    snapToGrid: true,
    isDragging: false,
    isResizing: false,
    isPanning: false,
    showObjectList: true,
    exportStatus: "idle",
    saveStatus: "saved",
    lastCalculationAt: plan.updatedAtIso,
    lastCalculationIso: plan.updatedAtIso,
    undoStack: [],
    redoStack: []
  };
  return selectedObjectId ? { ...state, selectedObjectId, selectedObjectType: "object" } : state;
}

export function editorReducer(state: EditorState, action: PlanAction): EditorState {
  switch (action.type) {
    case "SET_PLAN":
      return {
        ...state,
        currentPlan: action.plan,
        validationResults: action.plan.validationResults ?? action.plan.validationResult ?? state.validationResults,
        dirtyState: false,
        saveStatus: "saved",
        selectedObjectIds: [],
        selectionBox: null,
        lastCalculationAt: action.plan.updatedAtIso,
        lastCalculationIso: action.plan.updatedAtIso,
        undoStack: [],
        redoStack: []
      };
    case "UNDO":
      return undo(state);
    case "REDO":
      return redo(state);
    case "SELECT_OBJECT":
      return withSelection(state, action.objectId, action.objectType ?? inferSelectedObjectType(state.currentPlan, action.objectId));
    case "SET_SELECTED_OBJECTS":
      return withSelections(state, action.objectIds);
    case "ADD_TO_SELECTION":
      return withSelections(state, [...state.selectedObjectIds, action.objectId]);
    case "REMOVE_FROM_SELECTION":
      return withSelections(state, state.selectedObjectIds.filter((id) => id !== action.objectId));
    case "CLEAR_SELECTION":
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
        selectedObjectIds: [action.room.id],
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
        selectedObjectIds: [action.object.id],
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
        selectedObjectIds: [action.table.id],
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
        selectedObjectIds: [action.tableGroup.id],
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
    case "UPDATE_TABLE": {
      const table = state.currentPlan.tables.find((item) => item.id === action.tableId);
      if (!table) {
        return state;
      }
      const nextTable = applyTableChanges(table, action.changes);
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          tables: state.currentPlan.tables.map((item) => (item.id === action.tableId ? nextTable : item)),
          tableSeats: tableChangesAffectSeats(action.changes)
            ? state.currentPlan.tableSeats.flatMap((seat) => (seat.tableId === action.tableId ? [] : [seat])).concat(createTableSeatsFromTable(nextTable))
            : state.currentPlan.tableSeats,
          updatedAtIso: new Date().toISOString()
        }
      });
    }
    case "DELETE_OBJECT":
      return withHistory(state, deleteEntity(state, action.objectId));
    case "DELETE_OBJECTS":
      return withHistory(state, deleteEntities(state, action.objectIds));
    case "MOVE_OBJECT":
      return withHistory(state, moveEntity(state, action.objectId, action.dxMm, action.dyMm));
    case "MOVE_OBJECTS":
      return withHistory(state, moveEntities(state, action.objectIds, action.dxMm, action.dyMm));
    case "RESIZE_OBJECT":
      return withHistory(state, resizeEntity(state, action.objectId, action.widthMm, action.heightMm));
    case "LOCK_OBJECTS":
      return withHistory(state, setEntityLock(state, action.objectIds, true));
    case "UNLOCK_OBJECTS":
      return withHistory(state, setEntityLock(state, action.objectIds, false));
    case "SET_OBJECTS_VISIBLE":
      return withHistory(state, setEntityVisibility(state, action.objectIds, action.visible));
    case "DUPLICATE_SELECTION":
      return withHistory(state, duplicateSelection(state));
    case "SET_CHAIRS":
      return withHistory(state, {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          chairs: action.chairs,
          seatingBlocks: action.seatingBlocks,
          updatedAtIso: new Date().toISOString()
        },
        lastCalculationAt: new Date().toISOString(),
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
        lastCalculationAt: new Date().toISOString(),
        lastCalculationIso: new Date().toISOString()
      });
    case "SET_VALIDATION_RESULTS":
      return {
        ...state,
        validationResults: action.validationResults,
        currentPlan: {
          ...state.currentPlan,
          validationResult: action.validationResults,
          validationResults: action.validationResults
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
        zoom: Math.max(0.25, Math.min(2, action.zoom))
      };
    case "SET_PAN":
      return {
        ...state,
        panOffset: action.panOffset
      };
    case "SET_SELECTION_BOX":
      return {
        ...state,
        selectionBox: action.selectionBox
      };
    case "SET_SNAP_TO_GRID":
      return {
        ...state,
        snapToGrid: action.snapToGrid
      };
    case "SET_GRID_SIZE":
      return {
        ...state,
        gridSizeMm: Math.max(50, action.gridSizeMm)
      };
    case "SET_SHOW_OBJECT_LIST":
      return {
        ...state,
        showObjectList: action.showObjectList
      };
    case "SET_TRANSIENT_HINT":
      return {
        ...state,
        transientHint: action.transientHint
      };
    case "HIGHLIGHT_OBJECT":
      return {
        ...state,
        recentlyHighlightedObjectId: action.objectId
      };
    case "SET_SAVE_STATUS":
      return {
        ...state,
        saveStatus: action.saveStatus
      };
    case "SET_EXPORT_STATUS":
      return {
        ...state,
        exportStatus: action.exportStatus
      };
    case "SET_LAST_CALCULATION_AT":
      return {
        ...state,
        lastCalculationAt: action.lastCalculationAt,
        lastCalculationIso: action.lastCalculationAt
      };
    case "SET_INTERACTION_FLAGS":
      return {
        ...state,
        ...(action.isDragging === undefined ? {} : { isDragging: action.isDragging }),
        ...(action.isResizing === undefined ? {} : { isResizing: action.isResizing }),
        ...(action.isPanning === undefined ? {} : { isPanning: action.isPanning })
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
      validationResult: validationResults,
      validationResults
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
  const entry: EditorHistoryEntry = { plan: state.currentPlan, selectedObjectIds: state.selectedObjectIds };
  if (!state.selectedObjectId) {
    return entry;
  }
  return {
    ...entry,
    selectedObjectId: state.selectedObjectId,
    ...(state.selectedObjectType ? { selectedObjectType: state.selectedObjectType } : {})
  };
}

function applyHistoryEntry(state: EditorState, entry: EditorHistoryEntry, undoStack: EditorHistoryEntry[], redoStack: EditorHistoryEntry[]): EditorState {
  const next: EditorState = {
    ...state,
    currentPlan: entry.plan,
    validationResults: entry.plan.validationResults ?? entry.plan.validationResult ?? state.validationResults,
    dirtyState: true,
    selectedObjectIds: entry.selectedObjectIds ?? (entry.selectedObjectId ? [entry.selectedObjectId] : []),
    undoStack,
    redoStack
  };
  return entry.selectedObjectId
    ? { ...next, selectedObjectId: entry.selectedObjectId, ...(entry.selectedObjectType ? { selectedObjectType: entry.selectedObjectType } : {}) }
    : withoutSelection(next);
}

function deleteEntity(state: EditorState, id: string): EditorState {
  if (isEntityLocked(state.currentPlan, id)) {
    return state;
  }
  const group = state.currentPlan.tableGroups.find((tableGroup) => tableGroup.id === id);
  const tableIdsToDelete = new Set(group ? group.tableIds : [id]);
  const deletedTableIds = new Set(state.currentPlan.tables.filter((table) => tableIdsToDelete.has(table.id) && !table.locked).map((table) => table.id));

  return withSelections({
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.filter((object) => object.id !== id || object.locked),
      tableGroups: state.currentPlan.tableGroups.filter((tableGroup) => tableGroup.id !== id || tableGroup.locked),
      tables: state.currentPlan.tables.filter((table) => !deletedTableIds.has(table.id)),
      tableSeats: state.currentPlan.tableSeats.filter((seat) => !deletedTableIds.has(seat.tableId)),
      updatedAtIso: new Date().toISOString()
    }
  }, state.selectedObjectIds.filter((selectedId) => selectedId !== id && !deletedTableIds.has(selectedId)));
}

function deleteEntities(state: EditorState, ids: string[]): EditorState {
  return ids.reduce((next, id) => deleteEntity(next, id), state);
}

function withoutSelection(state: EditorState): EditorState {
  const { selectedObjectId: _selectedObjectId, selectedObjectType: _selectedObjectType, ...rest } = state;
  return { ...rest, selectedObjectIds: [], selectionBox: null };
}

function withSelection(state: EditorState, selectedObjectId: string, selectedObjectType?: SelectedObjectType): EditorState {
  return {
    ...state,
    selectedObjectId,
    selectedObjectIds: [selectedObjectId],
    selectionBox: null,
    ...(selectedObjectType ? { selectedObjectType } : {})
  };
}

function withSelections(state: EditorState, objectIds: string[]): EditorState {
  const selectedObjectIds = [...new Set(objectIds)].filter(Boolean);
  const selectedObjectId = selectedObjectIds[0];
  if (!selectedObjectId) {
    return withoutSelection(state);
  }
  const selectedObjectType = inferSelectedObjectType(state.currentPlan, selectedObjectId);
  return {
    ...state,
    selectedObjectId,
    selectedObjectIds,
    selectionBox: null,
    ...(selectedObjectType ? { selectedObjectType } : {})
  };
}

function moveEntity(state: EditorState, id: string, dxMm: number, dyMm: number): EditorState {
  if (isEntityLocked(state.currentPlan, id)) {
    return state;
  }
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
          ? moveTableSeat(seat, dxMm, dyMm)
          : seat
      ),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function moveEntities(state: EditorState, ids: string[], dxMm: number, dyMm: number): EditorState {
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.reduce((next, id) => moveEntity(next, id, dxMm, dyMm), state);
}

function resizeEntity(state: EditorState, id: string, widthMm?: number, heightMm?: number): EditorState {
  if (isEntityLocked(state.currentPlan, id)) {
    return state;
  }
  const group = state.currentPlan.tableGroups.find((tableGroup) => tableGroup.id === id);
  if (group) {
    return resizeTableGroup(state, group.tableIds, widthMm, heightMm);
  }
  const table = state.currentPlan.tables.find((item) => item.id === id);
  const resizedTable = table ? applyTableChanges(table, { ...(widthMm === undefined ? {} : { widthMm }), ...(heightMm === undefined ? {} : { depthMm: heightMm }) }) : null;

  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.map((object) => (object.id === id ? resizeObject(object, widthMm, heightMm) : object)),
      tables: state.currentPlan.tables.map((item) => (resizedTable && item.id === id ? resizedTable : item)),
      tableSeats: resizedTable ? state.currentPlan.tableSeats.filter((seat) => seat.tableId !== id).concat(createTableSeatsFromTable(resizedTable)) : state.currentPlan.tableSeats,
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
  if (object.locked || object.geometry.kind !== "rect") {
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
  if (object.locked || object.geometry.kind !== "rect") {
    return object;
  }
  const minimum = getMinimumSize(object.role);
  return {
    ...object,
    geometry: {
      ...object.geometry,
      rect: {
        ...object.geometry.rect,
        width: Math.max(minimum.width, widthMm ?? object.geometry.rect.width),
        height: Math.max(minimum.height, heightMm ?? object.geometry.rect.height)
      }
    }
  };
}

function moveRectValue(rect: Rect, dxMm: number, dyMm: number): Rect {
  return {
    ...rect,
    x: rect.x + dxMm,
    y: rect.y + dyMm
  };
}

function setEntityLock(state: EditorState, ids: string[], locked: boolean): EditorState {
  const idSet = new Set(ids.filter((id) => id !== state.currentPlan.room.id));
  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.map((object) => (idSet.has(object.id) ? { ...object, locked } : object)),
      tables: state.currentPlan.tables.map((table) => (idSet.has(table.id) ? { ...table, locked } : table)),
      tableGroups: state.currentPlan.tableGroups.map((group) => (idSet.has(group.id) ? { ...group, locked } : group)),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function setEntityVisibility(state: EditorState, ids: string[], visible: boolean): EditorState {
  const idSet = new Set(ids.filter((id) => id !== state.currentPlan.room.id));
  const groupIds = new Set(state.currentPlan.tableGroups.filter((group) => idSet.has(group.id)).flatMap((group) => group.tableIds));
  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: state.currentPlan.objects.map((object) => (idSet.has(object.id) ? { ...object, visible } : object)),
      tables: state.currentPlan.tables.map((table) => (idSet.has(table.id) || groupIds.has(table.id) ? { ...table, visible } : table)),
      tableGroups: state.currentPlan.tableGroups.map((group) => (idSet.has(group.id) ? { ...group, visible } : group)),
      updatedAtIso: new Date().toISOString()
    }
  };
}

function duplicateSelection(state: EditorState): EditorState {
  const selected = state.selectedObjectIds;
  if (selected.length === 0) {
    return state;
  }
  const selectedSet = new Set(selected);
  const idMap = new Map<string, string>();
  const duplicateId = (id: string) => {
    const existing = idMap.get(id);
    if (existing) {
      return existing;
    }
    const next = `${id}-copy-${Date.now()}-${idMap.size + 1}`;
    idMap.set(id, next);
    return next;
  };
  const duplicatedObjects = state.currentPlan.objects
    .filter((object) => selectedSet.has(object.id) && object.role !== "room")
    .map((object) => ({
      ...object,
      id: duplicateId(object.id),
      name: `${object.name} Kopie`,
      locked: false,
      visible: true,
      geometry: object.geometry.kind === "rect" ? { ...object.geometry, rect: moveRectValue(object.geometry.rect, 500, 500) } : object.geometry
    }));

  const selectedGroups = state.currentPlan.tableGroups.filter((group) => selectedSet.has(group.id));
  const selectedGroupTableIds = new Set(selectedGroups.flatMap((group) => group.tableIds));
  const duplicatedTables = state.currentPlan.tables
    .filter((table) => selectedSet.has(table.id) || selectedGroupTableIds.has(table.id))
    .map((table) => {
      const { groupId: _groupId, ...movedTable } = moveTable(table, 500, 500);
      const nextGroupId = table.groupId && selectedSet.has(table.groupId) ? duplicateId(table.groupId) : undefined;
      return {
        ...movedTable,
        id: duplicateId(table.id),
        name: `${table.name} Kopie`,
        locked: false,
        visible: true,
        ...(nextGroupId ? { groupId: nextGroupId } : {})
      };
    });
  const duplicatedTableIds = new Set(duplicatedTables.map((table) => table.id));
  const originalTableIds = new Set(state.currentPlan.tables.filter((table) => selectedSet.has(table.id) || selectedGroupTableIds.has(table.id)).map((table) => table.id));
  const duplicatedSeats = state.currentPlan.tableSeats
    .filter((seat) => originalTableIds.has(seat.tableId))
    .map((seat) => ({ ...moveTableSeat(seat, 500, 500), id: duplicateId(seat.id), tableId: duplicateId(seat.tableId) }))
    .filter((seat) => duplicatedTableIds.has(seat.tableId));
  const duplicatedGroups = selectedGroups.map((group) => ({
    ...group,
    id: duplicateId(group.id),
    name: `${group.name} Kopie`,
    tableIds: group.tableIds.map((tableId) => duplicateId(tableId)),
    locked: false,
    visible: true
  }));
  const selectedObjectIds = [...duplicatedObjects.map((object) => object.id), ...duplicatedGroups.map((group) => group.id), ...duplicatedTables.filter((table) => !table.groupId).map((table) => table.id)];
  return withSelections({
    ...state,
    currentPlan: {
      ...state.currentPlan,
      objects: [...state.currentPlan.objects, ...duplicatedObjects],
      tables: [...state.currentPlan.tables, ...duplicatedTables],
      tableSeats: [...state.currentPlan.tableSeats, ...duplicatedSeats],
      tableGroups: [...state.currentPlan.tableGroups, ...duplicatedGroups],
      updatedAtIso: new Date().toISOString()
    }
  }, selectedObjectIds);
}

function moveTable(table: Table, dxMm: number, dyMm: number): Table {
  const x = (table.x ?? table.position.x) + dxMm;
  const y = (table.y ?? table.position.y) + dyMm;
  return {
    ...table,
    x,
    y,
    position: { x, y }
  };
}

function moveTableSeat(seat: TableSeat, dxMm: number, dyMm: number): TableSeat {
  const x = (seat.x ?? seat.position.x) + dxMm;
  const y = (seat.y ?? seat.position.y) + dyMm;
  return {
    ...seat,
    x,
    y,
    position: { x, y }
  };
}

function scaleTable(table: Table, origin: Rect, scaleX: number, scaleY: number): Table {
  const widthMm = Math.max(600, table.widthMm * scaleX);
  const depthMm = Math.max(600, table.depthMm * scaleY);
  return {
    ...table,
    x: origin.x + ((table.x ?? table.position.x) - origin.x) * scaleX,
    y: origin.y + ((table.y ?? table.position.y) - origin.y) * scaleY,
    position: {
      x: origin.x + ((table.x ?? table.position.x) - origin.x) * scaleX,
      y: origin.y + ((table.y ?? table.position.y) - origin.y) * scaleY
    },
    widthMm,
    depthMm,
    ...(table.type === "round" ? { diameterMm: Math.max(widthMm, depthMm) } : {})
  };
}

function scaleSeat(seat: TableSeat, origin: Rect, scaleX: number, scaleY: number): TableSeat {
  const currentX = seat.x ?? seat.position.x;
  const currentY = seat.y ?? seat.position.y;
  const x = origin.x + (currentX - origin.x) * scaleX;
  const y = origin.y + (currentY - origin.y) * scaleY;
  return {
    ...seat,
    x,
    y,
    position: { x, y }
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
    x: table.x ?? table.position.x,
    y: table.y ?? table.position.y,
    width: table.type === "round" ? table.diameterMm ?? table.widthMm : table.widthMm,
    height: table.type === "round" ? table.diameterMm ?? table.depthMm : table.depthMm
  };
}

function isEntityLocked(plan: Plan, id: string): boolean {
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
  if (group) {
    return group.locked === true;
  }
  return false;
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

function inferSelectedObjectType(plan: Plan, objectId: string): SelectedObjectType | undefined {
  if (plan.room.id === objectId) {
    return "room";
  }
  if (plan.objects.some((object) => object.id === objectId)) {
    return "object";
  }
  if (plan.tables.some((table) => table.id === objectId)) {
    return "table";
  }
  if (plan.tableGroups.some((group) => group.id === objectId)) {
    return "table_group";
  }
  return undefined;
}

function getMinimumSize(role: DrawingObject["role"]): { width: number; height: number } {
  if (role === "stage") return { width: 1000, height: 1000 };
  if (role === "foh") return { width: 1000, height: 1000 };
  if (role === "no_seat_zone" || role === "stairs" || role === "stage_access" || role === "technical_area" || role === "wheelchair_area") return { width: 500, height: 500 };
  if (role === "escape_route") return { width: 500, height: 500 };
  if (role === "exit") return { width: 300, height: 300 };
  if (role === "seating_area") return { width: 1000, height: 1000 };
  if (role === "table_area") return { width: 1000, height: 1000 };
  if (role === "generated_aisle") return { width: 500, height: 500 };
  if (role === "table") return { width: 500, height: 500 };
  if (role === "seating_block") return { width: 1000, height: 1000 };
  return { width: 100, height: 100 };
}

function applyTableChanges(table: Table, changes: Partial<Table>): Table {
  const next: Table = { ...table, ...changes };
  const x = changes.x ?? changes.position?.x ?? next.x ?? next.position.x;
  const y = changes.y ?? changes.position?.y ?? next.y ?? next.position.y;
  const seatCount = changes.seatCount ?? changes.seats ?? next.seatCount ?? next.seats;
  const widthMm = Math.max(500, changes.widthMm ?? next.widthMm);
  const depthMm = Math.max(500, changes.depthMm ?? next.depthMm);
  const roundDiameter = next.type === "round" ? Math.max(500, changes.diameterMm ?? next.diameterMm ?? widthMm, widthMm, depthMm) : undefined;
  const normalized = {
    ...next,
    x,
    y,
    position: { x, y },
    widthMm: next.type === "round" ? roundDiameter ?? widthMm : widthMm,
    depthMm: next.type === "round" ? roundDiameter ?? depthMm : depthMm,
    ...(next.type === "round" && roundDiameter ? { diameterMm: roundDiameter } : {}),
    seatCount,
    seats: seatCount
  };
  if (normalized.type === "round") {
    return normalized;
  }
  const { diameterMm: _diameterMm, ...tableWithoutDiameter } = normalized;
  return tableWithoutDiameter;
}

function tableChangesAffectSeats(changes: Partial<Table>): boolean {
  return Boolean(changes.position || changes.x !== undefined || changes.y !== undefined || changes.widthMm !== undefined || changes.depthMm !== undefined || changes.diameterMm !== undefined || changes.seats !== undefined || changes.seatCount !== undefined || changes.type !== undefined);
}

function createTableSeatsFromTable(table: Table): TableSeat[] {
  const rect = tableToRect(table);
  const seatCount = table.seatCount ?? table.seats;
  if (table.type !== "round") {
    const seatsPerLongSide = Math.max(1, Math.ceil(seatCount / 2));
    return Array.from({ length: seatCount }, (_, index) => {
      const upperSide = index < seatsPerLongSide;
      const sideIndex = upperSide ? index : index - seatsPerLongSide;
      const x = rect.x + ((sideIndex + 1) * rect.width) / (seatsPerLongSide + 1) - 240;
      const y = upperSide ? rect.y - 800 : rect.y + rect.height + 320;
      return {
        id: `${table.id}-seat-${index + 1}`,
        tableId: table.id,
        x,
        y,
        position: { x, y },
        widthMm: 480,
        depthMm: 480,
        rotationDeg: upperSide ? 0 : 180
      };
    });
  }

  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
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
