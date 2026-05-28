import { chairToRect, objectOverlapsForbiddenArea, objectToRect, rectInsideRect, rectOverlapsAny, tableToRect } from "@seatflow/geometry";
import type {
  Chair,
  DrawingObject,
  Plan,
  SeatingBlock,
  Table,
  TableGroup,
  TableLayoutType,
  TableType,
  TableSeat,
  ValidationMessage
} from "@seatflow/types";

export interface GenerateSeatingOptions {
  chairWidthMm?: number;
  chairDepthMm?: number;
  rowClearanceMm?: number;
  targetSeats?: number;
  orientationDeg?: number;
}

export interface GenerateSeatingResult {
  seatingBlocks: SeatingBlock[];
  chairs: Chair[];
  warnings: ValidationMessage[];
}

export interface GenerateTableLayoutOptions {
  tableType?: TableType;
  layoutType?: TableLayoutType;
  targetSeats?: number;
  targetTables?: number;
  seatsPerTable?: number;
  tableDiameterMm?: number;
  tableWidthMm?: number;
  tableDepthMm?: number;
  tableSpacingMm?: number;
  chairDistanceMm?: number;
}

export interface GenerateTableLayoutResult {
  tableGroups: TableGroup[];
  tables: Table[];
  tableSeats: TableSeat[];
  warnings: ValidationMessage[];
}

export function generateSeating(plan: Plan, options: GenerateSeatingOptions = {}): GenerateSeatingResult {
  const chairWidthMm = options.chairWidthMm ?? plan.ruleProfile.minSeatWidthMm;
  const chairDepthMm = options.chairDepthMm ?? 520;
  const rowPitchMm = chairDepthMm + (options.rowClearanceMm ?? plan.ruleProfile.minRowClearanceMm);
  const seatPitchMm = chairWidthMm + 80;
  const roomRect = objectToRect(plan.room);
  const forbiddenAreas = getForbiddenAreas(plan);
  const blockedTableRects = plan.tables.map(tableToRect);
  const chairs: Chair[] = [];
  const warnings: ValidationMessage[] = [];
  const marginMm = 1000;
  let rowIndex = 0;

  for (let y = roomRect.y + marginMm; y + chairDepthMm <= roomRect.y + roomRect.height - marginMm; y += rowPitchMm) {
    if (rowIndex >= plan.ruleProfile.maxRowsPerBlock) {
      break;
    }

    let seatIndex = 0;
    for (let x = roomRect.x + marginMm; x + chairWidthMm <= roomRect.x + roomRect.width - marginMm; x += seatPitchMm) {
      if (options.targetSeats && chairs.length >= options.targetSeats) {
        break;
      }

      const chair: Chair = {
        id: `chair-${rowIndex + 1}-${seatIndex + 1}`,
        position: { x, y },
        widthMm: chairWidthMm,
        depthMm: chairDepthMm,
        rotationDeg: options.orientationDeg ?? 0,
        blockId: "seating-block-demo"
      };
      const chairRect = chairToRect(chair);

      if (rectInsideRect(chairRect, roomRect) && !objectOverlapsForbiddenArea(chairRect, forbiddenAreas) && !rectOverlapsAny(chairRect, blockedTableRects)) {
        chairs.push(chair);
      }

      seatIndex += 1;
    }

    rowIndex += 1;
  }

  if (options.targetSeats && chairs.length < options.targetSeats) {
    warnings.push({
      id: "target-seats-not-reached",
      severity: "warning",
      code: "TARGET_SEATS_NOT_REACHED",
      message: `Die gewünschte Anzahl von ${options.targetSeats} Stühlen wurde nicht erreicht.`
    });
  }

  const seatingBlock: SeatingBlock = {
    id: "seating-block-demo",
    name: "Automatisch generierter Stuhlblock",
    chairs,
    rowCount: rowIndex,
    seatCount: chairs.length
  };

  return {
    seatingBlocks: [seatingBlock],
    chairs,
    warnings
  };
}

export function generateTableLayout(plan: Plan, options: GenerateTableLayoutOptions = {}): GenerateTableLayoutResult {
  const roomRect = objectToRect(plan.room);
  const forbiddenAreas = getForbiddenAreas(plan);
  const tables: Table[] = [];
  const tableSeats: TableSeat[] = [];
  const warnings: ValidationMessage[] = [];
  const seatsPerTable = options.seatsPerTable ?? 8;
  const targetTables = options.targetTables ?? (options.targetSeats ? Math.ceil(options.targetSeats / seatsPerTable) : 8);
  const tableType = options.tableType ?? "round";
  const isRound = tableType === "round";
  const tableWidth = isRound ? options.tableDiameterMm ?? 1800 : options.tableWidthMm ?? 2200;
  const tableDepth = isRound ? options.tableDiameterMm ?? 1800 : options.tableDepthMm ?? 900;
  const spacing = options.tableSpacingMm ?? plan.ruleProfile.minTableDistanceMm;
  const chairDistance = options.chairDistanceMm ?? 320;
  const pitchX = tableWidth + spacing;
  const pitchY = tableDepth + spacing;
  const groupId = "table-group-demo";
  let index = 0;

  for (let y = roomRect.y + 5200; y + tableDepth <= roomRect.y + roomRect.height - 1200 && index < targetTables; y += pitchY) {
    for (let x = roomRect.x + 1200; x + tableWidth <= roomRect.x + roomRect.width - 1200 && index < targetTables; x += pitchX) {
      const table: Table = {
        id: `table-${index + 1}`,
        type: tableType,
        name: `${isRound ? "Runder Tisch" : "Rechteckiger Tisch"} ${index + 1}`,
        x,
        y,
        position: { x, y },
        widthMm: tableWidth,
        depthMm: tableDepth,
        ...(isRound ? { diameterMm: tableWidth } : {}),
        rotationDeg: 0,
        seatCount: seatsPerTable,
        seats: seatsPerTable,
        groupId
      };
      const rect = tableToRect(table);
      const placedRects = tables.map(tableToRect);

      if (
        rectInsideRect(rect, roomRect) &&
        !objectOverlapsForbiddenArea(rect, forbiddenAreas, plan.ruleProfile.minTableToEscapeRouteDistanceMm) &&
        !rectOverlapsAny(rect, placedRects.map((placed) => ({
          x: placed.x - spacing,
          y: placed.y - spacing,
          width: placed.width + spacing * 2,
          height: placed.height + spacing * 2
        })))
      ) {
        tables.push(table);
        tableSeats.push(...createTableSeats(table, seatsPerTable, chairDistance));
        index += 1;
      }
    }
  }

  if (tables.length < targetTables) {
    warnings.push({
      id: "target-tables-not-reached",
      severity: "warning",
      code: "TARGET_TABLES_NOT_REACHED",
      message: `Es konnten nur ${tables.length} von ${targetTables} Tischen platziert werden.`
    });
  }

  return {
    tableGroups: [
      {
        id: groupId,
        name: "Demo-Tischgruppe",
        layoutType: options.layoutType ?? "grid",
        tableIds: tables.map((table) => table.id),
        tables,
        seats: tableSeats
      }
    ],
    tables,
    tableSeats,
    warnings
  };
}

function createTableSeats(table: Table, seatsPerTable: number, chairDistanceMm: number): TableSeat[] {
  const rect = tableToRect(table);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const seats: TableSeat[] = [];

  if (table.type !== "round") {
    const seatsPerLongSide = Math.max(1, Math.ceil(seatsPerTable / 2));
    for (let index = 0; index < seatsPerTable; index += 1) {
      const upperSide = index < seatsPerLongSide;
      const sideIndex = upperSide ? index : index - seatsPerLongSide;
      const x = rect.x + ((sideIndex + 1) * rect.width) / (seatsPerLongSide + 1) - 240;
      const y = upperSide ? rect.y - chairDistanceMm - 480 : rect.y + rect.height + chairDistanceMm;
      seats.push({
        id: `${table.id}-seat-${index + 1}`,
        tableId: table.id,
        x,
        y,
        position: { x, y },
        widthMm: 480,
        depthMm: 480,
        rotationDeg: upperSide ? 0 : 180
      });
    }
    return seats;
  }

  const radiusX = rect.width / 2 + chairDistanceMm;
  const radiusY = rect.height / 2 + chairDistanceMm;
  for (let index = 0; index < seatsPerTable; index += 1) {
    const angle = (Math.PI * 2 * index) / seatsPerTable;
    const x = center.x + Math.cos(angle) * radiusX - 240;
    const y = center.y + Math.sin(angle) * radiusY - 240;
    seats.push({
      id: `${table.id}-seat-${index + 1}`,
      tableId: table.id,
      x,
      y,
      position: { x, y },
      widthMm: 480,
      depthMm: 480,
      rotationDeg: (angle * 180) / Math.PI
    });
  }

  return seats;
}

export function getForbiddenAreas(plan: Plan): DrawingObject[] {
  return plan.objects.filter((object) =>
    ["stage", "foh", "escape_route", "exit", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)
  );
}
