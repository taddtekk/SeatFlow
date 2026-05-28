import {
  chairToRect,
  distanceBetweenRects,
  expandRect,
  getForbiddenRectsFromPlan,
  getRectCenter,
  getRoomRect,
  objectToRect,
  rectInsideRect,
  rectOverlapsAny,
  tableToRect
} from "@seatflow/geometry";
import type {
  Chair,
  DrawingObject,
  Plan,
  Rect,
  SeatingAreaProperties,
  SeatingBlock,
  Table,
  TableAreaLayoutType,
  TableAreaProperties,
  TableGroup,
  TableLayoutType,
  TableSeat,
  TableType,
  ValidationMessage
} from "@seatflow/types";

export interface GenerateSeatingOptions {
  areaIds?: string[];
  chairWidthMm?: number;
  chairDepthMm?: number;
  rowClearanceMm?: number;
  rowPitchMm?: number;
  targetSeats?: number;
  orientationDeg?: number;
}

export interface GenerateSeatingStats {
  requestedSeats: number;
  placedSeats: number;
  removedBecauseBlocked: number;
  generatedBlocks: number;
  usedSeatingAreas: number;
}

export interface GenerateSeatingResult {
  seatingBlocks: SeatingBlock[];
  chairs: Chair[];
  generatedAisles: DrawingObject[];
  warnings: ValidationMessage[];
  stats: GenerateSeatingStats;
}

export interface GenerateTableLayoutOptions {
  areaIds?: string[];
  tableType?: TableType;
  tableLayoutType?: TableAreaLayoutType;
  layoutType?: TableLayoutType;
  targetSeats?: number;
  targetTables?: number;
  seatsPerTable?: number;
  tableDiameterMm?: number;
  tableWidthMm?: number;
  tableDepthMm?: number;
  tableSpacingMm?: number;
  chairDistanceMm?: number;
  rowSpacingMm?: number;
  orientationDeg?: number;
}

export interface GenerateTableLayoutStats {
  requestedSeats: number;
  placedSeats: number;
  placedTables: number;
  usedTableAreas: number;
  unplacedSeats: number;
}

export interface GenerateTableLayoutResult {
  tableGroups: TableGroup[];
  tables: Table[];
  tableSeats: TableSeat[];
  warnings: ValidationMessage[];
  stats: GenerateTableLayoutStats;
}

export interface GenerateLayoutsOptions {
  seating?: GenerateSeatingOptions;
  tables?: GenerateTableLayoutOptions;
}

export interface GenerateLayoutsResult {
  plan: Plan;
  seatingResult: GenerateSeatingResult;
  tableLayoutResult: GenerateTableLayoutResult;
  stats: {
    requestedSeats: number;
    placedSeats: number;
    placedTables: number;
    generatedBlocks: number;
    usedSeatingAreas: number;
    usedTableAreas: number;
  };
}

export function generateSeating(plan: Plan, options: GenerateSeatingOptions = {}): GenerateSeatingResult {
  const roomRect = getRoomRect(plan);
  const seatingAreas = getAreaObjects(plan, "seating_area", options.areaIds);
  const areas = seatingAreas.length > 0 ? seatingAreas : [createFallbackArea(plan)];
  const warnings: ValidationMessage[] = [];
  const generatedAisles: DrawingObject[] = [];
  const chairs: Chair[] = [];
  const seatingBlocks: SeatingBlock[] = [];
  let removedBecauseBlocked = 0;
  let requestedSeats = 0;

  areas.forEach((area, areaIndex) => {
    const areaProps = getSeatingAreaProperties(area);
    const chairWidthMm = areaProps.chairWidthMm ?? options.chairWidthMm ?? plan.ruleProfile.minSeatWidthMm;
    const chairDepthMm = areaProps.chairDepthMm ?? options.chairDepthMm ?? 520;
    const rowPitchMm = areaProps.rowPitchMm ?? options.rowPitchMm ?? (options.rowClearanceMm ? chairDepthMm + options.rowClearanceMm : chairDepthMm + plan.ruleProfile.minRowClearanceMm);
    const orientationDeg = areaProps.orientationDeg ?? options.orientationDeg ?? 0;
    const targetSeatCount = areaProps.targetSeatCount ?? options.targetSeats ?? 0;
    const maxSeatCount = areaProps.maxSeatCount ?? Number.POSITIVE_INFINITY;
    const generateMode = areaProps.generateMode ?? (targetSeatCount > 0 ? "target" : "max");
    const requestedForArea = generateMode === "target" && targetSeatCount > 0 ? targetSeatCount : maxSeatCount;
    requestedSeats += Number.isFinite(requestedForArea) ? requestedForArea : 0;

    const blockPrefix = areaProps.blockNamePrefix ?? `Block ${String.fromCharCode(65 + areaIndex)}`;
    const areaRect = objectToRect(area);
    const blockedRects = getForbiddenRectsFromPlan(plan, {
      excludeObjectIds: [area.id, ...plan.objects.filter((object) => object.role === "generated_aisle").map((object) => object.id)],
      includeTables: true,
      safetyDistanceMm: 0
    });
    const aislePlan = buildSeatingAisles(area, areaRect, areaProps, rowPitchMm);
    generatedAisles.push(...aislePlan.aisles);
    const xSegments = aislePlan.xSegments;
    const blockedWithAisles = [...blockedRects, ...aislePlan.aisles.map(objectToRect)];
    let generatedRows = 0;
    let placedInArea = 0;

    for (let y = areaRect.y; y + chairDepthMm <= areaRect.y + areaRect.height; y += rowPitchMm) {
      if (areaProps.crossAisleEveryRows && generatedRows > 0 && generatedRows % areaProps.crossAisleEveryRows === 0) {
        const aisleRect = { x: areaRect.x, y, width: areaRect.width, height: Math.min(plan.ruleProfile.minAisleWidthMm, rowPitchMm) };
        const aisle = createGeneratedAisle(area.id, `Querweg ${blockPrefix} ${generatedRows / areaProps.crossAisleEveryRows}`, aisleRect);
        generatedAisles.push(aisle);
        blockedWithAisles.push(aisleRect);
        y += aisleRect.height;
      }

      let rowSeatIndex = 0;
      for (const segment of xSegments) {
        for (let x = segment.x; x + chairWidthMm <= segment.x + segment.width; x += chairWidthMm + 80) {
          if (placedInArea >= maxSeatCount || (generateMode === "target" && targetSeatCount > 0 && placedInArea >= targetSeatCount)) {
            break;
          }
          const chair: Chair = {
            id: `${area.id}-chair-${generatedRows + 1}-${rowSeatIndex + 1}`,
            position: { x, y },
            widthMm: chairWidthMm,
            depthMm: chairDepthMm,
            rotationDeg: orientationDeg,
            rowIndex: generatedRows + 1,
            seatIndex: rowSeatIndex + 1,
            label: `${blockPrefix}-${generatedRows + 1}-${rowSeatIndex + 1}`,
            blockId: `${area.id}-block`,
            seatingAreaId: area.id
          };
          const chairRect = chairToRect(chair);
          if (rectInsideRect(chairRect, roomRect) && rectInsideRect(chairRect, areaRect) && !rectOverlapsAny(chairRect, blockedWithAisles)) {
            chairs.push(chair);
            placedInArea += 1;
            rowSeatIndex += 1;
          } else {
            removedBecauseBlocked += 1;
          }
        }
      }
      if (rowSeatIndex > 0) {
        generatedRows += 1;
      }
    }

    const blockChairs = chairs.filter((chair) => chair.blockId === `${area.id}-block`);
    seatingBlocks.push({
      id: `${area.id}-block`,
      name: blockPrefix,
      chairs: blockChairs,
      rowCount: generatedRows,
      seatCount: blockChairs.length,
      areaId: area.id,
      bounds: areaRect,
      generatedAisles: generatedAisles.filter((aisle) => aisle.properties?.sourceAreaId === area.id),
      properties: {
        generated: true,
        maxSeatCount,
        targetSeatCount,
        generateMode
      }
    });

    if (generateMode === "target" && targetSeatCount > 0 && placedInArea < targetSeatCount) {
      warnings.push(warning("TARGET_SEATS_NOT_REACHED", area.id, area.name, `Im Bereich ${area.name} wurden nur ${placedInArea} von ${targetSeatCount} gewünschten Stühlen platziert.`));
    }
  });

  return {
    seatingBlocks,
    chairs,
    generatedAisles,
    warnings,
    stats: {
      requestedSeats,
      placedSeats: chairs.length,
      removedBecauseBlocked,
      generatedBlocks: seatingBlocks.length,
      usedSeatingAreas: seatingAreas.length
    }
  };
}

export function generateTableLayout(plan: Plan, options: GenerateTableLayoutOptions = {}): GenerateTableLayoutResult {
  const roomRect = getRoomRect(plan);
  const tableAreas = getAreaObjects(plan, "table_area", options.areaIds);
  const areas = tableAreas.length > 0 ? tableAreas : [createFallbackTableArea(plan)];
  const warnings: ValidationMessage[] = [];
  const tables: Table[] = [];
  const tableSeats: TableSeat[] = [];
  const tableGroups: TableGroup[] = [];
  let requestedSeats = 0;

  areas.forEach((area, areaIndex) => {
    const props = getTableAreaProperties(area);
    const layoutType = options.tableLayoutType ?? props.tableLayoutType ?? normalizeTableLayoutType(options.layoutType) ?? "rounds";
    const tableType = options.tableType ?? props.tableType ?? tableTypeForLayout(layoutType);
    const seatsPerTable = props.seatsPerTable ?? options.seatsPerTable ?? 8;
    const targetSeats = props.targetSeats ?? options.targetSeats ?? (options.targetTables ? options.targetTables * seatsPerTable : 64);
    const targetTables = options.targetTables ?? Math.ceil(targetSeats / seatsPerTable);
    const tableDiameterMm = props.tableDiameterMm ?? options.tableDiameterMm ?? 1800;
    const tableWidthMm = props.tableWidthMm ?? options.tableWidthMm ?? (layoutType === "parliamentary" ? 1800 : 2200);
    const tableDepthMm = props.tableDepthMm ?? options.tableDepthMm ?? 800;
    const tableSpacingMm = props.tableSpacingMm ?? options.tableSpacingMm ?? plan.ruleProfile.minTableDistanceMm;
    const chairDistanceMm = props.chairDistanceMm ?? options.chairDistanceMm ?? 320;
    const rowSpacingMm = props.rowSpacingMm ?? options.rowSpacingMm ?? tableSpacingMm;
    const areaRect = objectToRect(area);
    const groupId = `${area.id}-group`;
    const groupTables: Table[] = [];
    const groupSeats: TableSeat[] = [];
    requestedSeats += targetSeats;

    const blockedRects = getForbiddenRectsFromPlan(plan, {
      excludeObjectIds: [area.id],
      includeTables: false,
      safetyDistanceMm: plan.ruleProfile.minTableToEscapeRouteDistanceMm
    });
    let placedTables = 0;

    const tableSize = tableType === "round" ? { width: tableDiameterMm, height: tableDiameterMm } : { width: tableWidthMm, height: tableDepthMm };
    const pitchX = tableSize.width + tableSpacingMm;
    const pitchY = tableSize.height + (layoutType === "parliamentary" ? rowSpacingMm + 650 : rowSpacingMm);

    for (let y = areaRect.y; y + tableSize.height <= areaRect.y + areaRect.height && placedTables < targetTables; y += pitchY) {
      for (let x = areaRect.x; x + tableSize.width <= areaRect.x + areaRect.width && placedTables < targetTables; x += pitchX) {
        const table: Table = {
          id: `${area.id}-table-${placedTables + 1}`,
          type: tableType,
          name: `${tableNameForLayout(layoutType)} ${placedTables + 1}`,
          x,
          y,
          position: { x, y },
          widthMm: tableSize.width,
          depthMm: tableSize.height,
          ...(tableType === "round" ? { diameterMm: tableDiameterMm } : {}),
          rotationDeg: props.orientationDeg ?? options.orientationDeg ?? 0,
          seatCount: seatsPerTable,
          seats: seatsPerTable,
          groupId,
          areaId: area.id,
          properties: { layoutType }
        };
        const tableRect = tableToRect(table);
        const currentBlocked = [...blockedRects, ...tables.map((placed) => expandRect(tableToRect(placed), tableSpacingMm)), ...groupTables.map((placed) => expandRect(tableToRect(placed), tableSpacingMm))];
        if (!rectInsideRect(tableRect, roomRect) || !rectInsideRect(tableRect, areaRect) || rectOverlapsAny(tableRect, currentBlocked)) {
          continue;
        }
        const seats = createTableSeats(table, seatsPerTable, chairDistanceMm, layoutType);
        const seatsFit = seats.every((seat) => rectInsideRect({ x: seat.x ?? seat.position.x, y: seat.y ?? seat.position.y, width: seat.widthMm, height: seat.depthMm }, roomRect));
        if (!seatsFit) {
          continue;
        }
        groupTables.push(table);
        groupSeats.push(...seats);
        placedTables += 1;
      }
    }

    if (groupTables.length * seatsPerTable < targetSeats) {
      warnings.push(warning("TARGET_TABLE_SEATS_NOT_REACHED", area.id, area.name, `Im Bereich ${area.name} wurden ${groupTables.length * seatsPerTable} von ${targetSeats} gewünschten Tisch-Sitzplätzen platziert.`));
    }

    tableGroups.push({
      id: groupId,
      name: area.name || `Tischbereich ${areaIndex + 1}`,
      layoutType: normalizeCoreLayoutType(layoutType),
      tableIds: groupTables.map((table) => table.id),
      tables: groupTables,
      seats: groupSeats,
      properties: { areaId: area.id, generated: true, layoutType }
    });
    tables.push(...groupTables);
    tableSeats.push(...groupSeats);
  });

  const placedSeats = tableSeats.length;
  return {
    tableGroups,
    tables,
    tableSeats,
    warnings,
    stats: {
      requestedSeats,
      placedSeats,
      placedTables: tables.length,
      usedTableAreas: tableAreas.length,
      unplacedSeats: Math.max(0, requestedSeats - placedSeats)
    }
  };
}

export function generateLayouts(plan: Plan, options: GenerateLayoutsOptions = {}): GenerateLayoutsResult {
  const seatingResult = generateSeating(plan, options.seating);
  const planWithSeating: Plan = {
    ...plan,
    objects: replaceGeneratedAisles(plan.objects, seatingResult.generatedAisles),
    chairs: seatingResult.chairs,
    seatingBlocks: seatingResult.seatingBlocks
  };
  const tableLayoutResult = generateTableLayout(planWithSeating, options.tables);
  const nextPlan: Plan = {
    ...planWithSeating,
    tables: tableLayoutResult.tables,
    tableSeats: tableLayoutResult.tableSeats,
    tableGroups: tableLayoutResult.tableGroups
  };

  return {
    plan: nextPlan,
    seatingResult,
    tableLayoutResult,
    stats: {
      requestedSeats: seatingResult.stats.requestedSeats + tableLayoutResult.stats.requestedSeats,
      placedSeats: seatingResult.stats.placedSeats + tableLayoutResult.stats.placedSeats,
      placedTables: tableLayoutResult.stats.placedTables,
      generatedBlocks: seatingResult.stats.generatedBlocks,
      usedSeatingAreas: seatingResult.stats.usedSeatingAreas,
      usedTableAreas: tableLayoutResult.stats.usedTableAreas
    }
  };
}

export function getForbiddenAreas(plan: Plan): DrawingObject[] {
  return plan.objects.filter((object) =>
    ["stage", "foh", "escape_route", "exit", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area", "table_area", "generated_aisle"].includes(object.role)
  );
}

function buildSeatingAisles(area: DrawingObject, areaRect: Rect, props: SeatingAreaProperties, rowPitchMm: number): { xSegments: Rect[]; aisles: DrawingObject[] } {
  const leftAisle = props.leftAisleMm ?? 0;
  const rightAisle = props.rightAisleMm ?? 0;
  const centerAisle = props.centerAisleMm ?? 0;
  const usableX = areaRect.x + leftAisle;
  const usableRight = areaRect.x + areaRect.width - rightAisle;
  const aisles: DrawingObject[] = [];

  if (leftAisle > 0) {
    aisles.push(createGeneratedAisle(area.id, `${area.name} linker Gang`, { x: areaRect.x, y: areaRect.y, width: leftAisle, height: areaRect.height }));
  }
  if (rightAisle > 0) {
    aisles.push(createGeneratedAisle(area.id, `${area.name} rechter Gang`, { x: usableRight, y: areaRect.y, width: rightAisle, height: areaRect.height }));
  }
  if (centerAisle > 0) {
    const centerX = areaRect.x + areaRect.width / 2;
    aisles.push(createGeneratedAisle(area.id, `${area.name} Mittelgang`, { x: centerX - centerAisle / 2, y: areaRect.y, width: centerAisle, height: areaRect.height }));
    return {
      aisles,
      xSegments: [
        { x: usableX, y: areaRect.y, width: Math.max(0, centerX - centerAisle / 2 - usableX), height: areaRect.height },
        { x: centerX + centerAisle / 2, y: areaRect.y, width: Math.max(0, usableRight - (centerX + centerAisle / 2)), height: areaRect.height }
      ].filter((segment) => segment.width >= 500)
    };
  }

  return {
    aisles,
    xSegments: [{ x: usableX, y: areaRect.y, width: Math.max(0, usableRight - usableX), height: areaRect.height }].filter((segment) => segment.width >= 500)
  };
}

function createGeneratedAisle(sourceAreaId: string, name: string, rect: Rect): DrawingObject {
  return {
    id: `generated-aisle-${sourceAreaId}-${Math.round(rect.x)}-${Math.round(rect.y)}-${Math.round(rect.width)}-${Math.round(rect.height)}`,
    role: "generated_aisle",
    type: "rect",
    name,
    locked: true,
    visible: true,
    geometry: { kind: "rect", rect },
    properties: {
      generated: true,
      sourceAreaId,
      source: "seating"
    }
  };
}

function createFallbackArea(plan: Plan): DrawingObject {
  const room = getRoomRect(plan);
  return {
    id: "fallback-seating-area",
    role: "seating_area",
    type: "rect",
    name: "Fallback-Bestuhlungsbereich",
    geometry: { kind: "rect", rect: { x: room.x + 1000, y: room.y + 1000, width: Math.max(0, room.width - 2000), height: Math.max(0, room.height - 2000) } },
    properties: { generateMode: "max", blockNamePrefix: "Block A" }
  };
}

function createFallbackTableArea(plan: Plan): DrawingObject {
  const room = getRoomRect(plan);
  return {
    id: "fallback-table-area",
    role: "table_area",
    type: "rect",
    name: "Fallback-Tischbereich",
    geometry: { kind: "rect", rect: { x: room.x + 1200, y: room.y + 5200, width: Math.max(0, room.width - 2400), height: Math.max(0, room.height - 6400) } },
    properties: { tableLayoutType: "rounds", targetSeats: 96, seatsPerTable: 8 }
  };
}

function getAreaObjects(plan: Plan, role: "seating_area" | "table_area", areaIds?: string[]): DrawingObject[] {
  const idSet = areaIds ? new Set(areaIds) : null;
  return plan.objects.filter((object) => object.role === role && object.visible !== false && (!idSet || idSet.has(object.id)));
}

function getSeatingAreaProperties(area: DrawingObject): SeatingAreaProperties {
  return (area.properties ?? {}) as SeatingAreaProperties;
}

function getTableAreaProperties(area: DrawingObject): TableAreaProperties {
  return (area.properties ?? {}) as TableAreaProperties;
}

function createTableSeats(table: Table, seatsPerTable: number, chairDistanceMm: number, layoutType: TableAreaLayoutType): TableSeat[] {
  if (table.type === "round") {
    return createRoundTableSeats(table, seatsPerTable, chairDistanceMm);
  }
  if (layoutType === "parliamentary") {
    return createParliamentarySeats(table, seatsPerTable, chairDistanceMm);
  }
  return createRectangularTableSeats(table, seatsPerTable, chairDistanceMm);
}

function createRoundTableSeats(table: Table, seatsPerTable: number, chairDistanceMm: number): TableSeat[] {
  const rect = tableToRect(table);
  const center = getRectCenter(rect);
  const radiusX = rect.width / 2 + chairDistanceMm;
  const radiusY = rect.height / 2 + chairDistanceMm;
  return Array.from({ length: seatsPerTable }, (_, index) => {
    const angle = (Math.PI * 2 * index) / seatsPerTable;
    const x = center.x + Math.cos(angle) * radiusX - 240;
    const y = center.y + Math.sin(angle) * radiusY - 240;
    return createSeat(table.id, index, x, y, (angle * 180) / Math.PI);
  });
}

function createRectangularTableSeats(table: Table, seatsPerTable: number, chairDistanceMm: number): TableSeat[] {
  const rect = tableToRect(table);
  const seatsPerLongSide = Math.max(1, Math.ceil(seatsPerTable / 2));
  return Array.from({ length: seatsPerTable }, (_, index) => {
    const upperSide = index < seatsPerLongSide;
    const sideIndex = upperSide ? index : index - seatsPerLongSide;
    const x = rect.x + ((sideIndex + 1) * rect.width) / (seatsPerLongSide + 1) - 240;
    const y = upperSide ? rect.y - chairDistanceMm - 480 : rect.y + rect.height + chairDistanceMm;
    return createSeat(table.id, index, x, y, upperSide ? 0 : 180);
  });
}

function createParliamentarySeats(table: Table, seatsPerTable: number, chairDistanceMm: number): TableSeat[] {
  const rect = tableToRect(table);
  const seats = Math.max(1, seatsPerTable);
  return Array.from({ length: seats }, (_, index) => {
    const x = rect.x + ((index + 1) * rect.width) / (seats + 1) - 240;
    const y = rect.y + rect.height + chairDistanceMm;
    return createSeat(table.id, index, x, y, 0);
  });
}

function createSeat(tableId: string, index: number, x: number, y: number, rotationDeg: number): TableSeat {
  return {
    id: `${tableId}-seat-${index + 1}`,
    tableId,
    x,
    y,
    position: { x, y },
    widthMm: 480,
    depthMm: 480,
    rotationDeg
  };
}

function normalizeTableLayoutType(layoutType?: TableLayoutType): TableAreaLayoutType | undefined {
  if (!layoutType) return undefined;
  if (layoutType === "grid" || layoutType === "mixed" || layoutType === "custom") return "rounds";
  if (layoutType === "boardroom") return "block";
  return layoutType;
}

function normalizeCoreLayoutType(layoutType: TableAreaLayoutType): TableLayoutType {
  if (layoutType === "rounds" || layoutType === "rectangular") return "grid";
  return layoutType;
}

function tableTypeForLayout(layoutType: TableAreaLayoutType): TableType {
  if (layoutType === "rounds") return "round";
  if (layoutType === "rectangular") return "rectangle";
  if (layoutType === "parliamentary") return "parliamentary";
  if (layoutType === "banquet") return "banquet";
  if (layoutType === "block") return "block";
  return "rectangle";
}

function tableNameForLayout(layoutType: TableAreaLayoutType): string {
  if (layoutType === "rounds") return "Runder Tisch";
  if (layoutType === "parliamentary") return "Parlamentarischer Tisch";
  if (layoutType === "banquet") return "Banketttisch";
  if (layoutType === "block") return "Blocktisch";
  return "Rechtecktisch";
}

function replaceGeneratedAisles(objects: DrawingObject[], generatedAisles: DrawingObject[]): DrawingObject[] {
  return [...objects.filter((object) => object.role !== "generated_aisle" || object.properties?.source !== "seating"), ...generatedAisles];
}

function warning(code: string, objectId: string, objectName: string, message: string): ValidationMessage {
  return {
    id: `${code.toLowerCase()}-${objectId}`,
    severity: "warning",
    code,
    objectId,
    objectName,
    message
  };
}

export function hasMinimumDistanceToTables(table: Table, tables: Table[], minDistanceMm: number): boolean {
  return tables.every((other) => other.id === table.id || distanceBetweenRects(tableToRect(table), tableToRect(other)) >= minDistanceMm);
}
