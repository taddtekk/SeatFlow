import { chairToRect, objectOverlapsForbiddenArea, objectToRect, rectInsideRect, tableToRect } from "@seatflow/geometry";
import type {
  Chair,
  DrawingObject,
  Plan,
  SeatingBlock,
  Table,
  TableGroup,
  TableLayoutType,
  TableSeat,
  ValidationMessage
} from "@seatflow/types";

export interface GenerateSeatingOptions {
  chairWidthMm?: number;
  chairDepthMm?: number;
  targetSeats?: number;
}

export interface GenerateSeatingResult {
  seatingBlocks: SeatingBlock[];
  chairs: Chair[];
  warnings: ValidationMessage[];
}

export interface GenerateTableLayoutOptions {
  tableType?: "round" | "rectangular" | "banquet";
  layoutType?: TableLayoutType;
  targetTables?: number;
  seatsPerTable?: number;
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
  const rowPitchMm = chairDepthMm + plan.ruleProfile.minRowClearanceMm;
  const seatPitchMm = chairWidthMm + 80;
  const roomRect = objectToRect(plan.room);
  const forbiddenAreas = getForbiddenAreas(plan);
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
      const chair: Chair = {
        id: `chair-${rowIndex + 1}-${seatIndex + 1}`,
        position: { x, y },
        widthMm: chairWidthMm,
        depthMm: chairDepthMm,
        rotationDeg: 0,
        blockId: "seating-block-demo"
      };
      const chairRect = chairToRect(chair);

      if (rectInsideRect(chairRect, roomRect) && !objectOverlapsForbiddenArea(chairRect, forbiddenAreas)) {
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
  const targetTables = options.targetTables ?? 8;
  const seatsPerTable = options.seatsPerTable ?? 8;
  const tableType = options.tableType ?? "round";
  const tableWidth = tableType === "round" ? 1600 : 2200;
  const tableDepth = tableType === "round" ? 1600 : 900;
  const pitchX = tableWidth + plan.ruleProfile.minTableDistanceMm;
  const pitchY = tableDepth + plan.ruleProfile.minTableDistanceMm;
  const groupId = "table-group-demo";
  let index = 0;

  for (let y = roomRect.y + 5200; y + tableDepth <= roomRect.y + roomRect.height - 1200 && index < targetTables; y += pitchY) {
    for (let x = roomRect.x + 1200; x + tableWidth <= roomRect.x + roomRect.width - 1200 && index < targetTables; x += pitchX) {
      const table: Table = {
        id: `table-${index + 1}`,
        type: tableType,
        name: `${tableType === "round" ? "Runder Tisch" : "Tisch"} ${index + 1}`,
        position: { x, y },
        widthMm: tableWidth,
        depthMm: tableDepth,
        ...(tableType === "round" ? { diameterMm: tableWidth } : {}),
        rotationDeg: 0,
        seats: seatsPerTable,
        groupId
      };
      const rect = tableToRect(table);

      if (rectInsideRect(rect, roomRect) && !objectOverlapsForbiddenArea(rect, forbiddenAreas, plan.ruleProfile.minTableToEscapeRouteDistanceMm)) {
        tables.push(table);
        tableSeats.push(...createTableSeats(table, seatsPerTable));
        index += 1;
      }
    }
  }

  if (tables.length < targetTables) {
    warnings.push({
      id: "target-tables-not-reached",
      severity: "warning",
      message: `Es konnten nur ${tables.length} von ${targetTables} Tischen platziert werden.`
    });
  }

  return {
    tableGroups: [{ id: groupId, name: "Demo-Tischgruppe", layoutType: options.layoutType ?? "grid", tableIds: tables.map((table) => table.id) }],
    tables,
    tableSeats,
    warnings
  };
}

function createTableSeats(table: Table, seatsPerTable: number): TableSeat[] {
  const rect = tableToRect(table);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const radiusX = rect.width / 2 + 280;
  const radiusY = rect.height / 2 + 280;
  const seats: TableSeat[] = [];

  for (let index = 0; index < seatsPerTable; index += 1) {
    const angle = (Math.PI * 2 * index) / seatsPerTable;
    seats.push({
      id: `${table.id}-seat-${index + 1}`,
      tableId: table.id,
      position: {
        x: center.x + Math.cos(angle) * radiusX - 240,
        y: center.y + Math.sin(angle) * radiusY - 240
      },
      widthMm: 480,
      depthMm: 480,
      rotationDeg: (angle * 180) / Math.PI
    });
  }

  return seats;
}

export function getForbiddenAreas(plan: Plan): DrawingObject[] {
  return plan.objects.filter((object) =>
    ["stage", "foh", "escape_route", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)
  );
}
