import type { Chair, DrawingObject, Geometry, Plan, Point, Rect, Table, TableSeat } from "@seatflow/types";

export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return pointInRect(point, rect);
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return rectsOverlap(a, b);
}

export function rectIntersectsRect(a: Rect, b: Rect): boolean {
  return rectsOverlap(a, b);
}

export function rectInsideRect(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return rectInsideRect(inner, outer);
}

export function expandRect(rect: Rect, amountMm: number): Rect {
  return {
    x: rect.x - amountMm,
    y: rect.y - amountMm,
    width: rect.width + amountMm * 2,
    height: rect.height + amountMm * 2
  };
}

export function shrinkRect(rect: Rect, amountMm: number): Rect {
  return {
    x: rect.x + amountMm,
    y: rect.y + amountMm,
    width: Math.max(0, rect.width - amountMm * 2),
    height: Math.max(0, rect.height - amountMm * 2)
  };
}

export function moveRect(rect: Rect, dxMm: number, dyMm: number): Rect {
  return {
    ...rect,
    x: rect.x + dxMm,
    y: rect.y + dyMm
  };
}

export function resizeRect(rect: Rect, widthMm?: number, heightMm?: number): Rect {
  return {
    ...rect,
    ...(widthMm === undefined ? {} : { width: widthMm }),
    ...(heightMm === undefined ? {} : { height: heightMm })
  };
}

export function objectToRect(object: DrawingObject): Rect {
  return geometryToRect(object.geometry);
}

export function geometryToRect(geometry: Geometry): Rect {
  if (geometry.kind === "rect") {
    return geometry.rect;
  }

  const xs = geometry.polygon.points.map((point) => point.x);
  const ys = geometry.polygon.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY
  };
}

export function chairToRect(chair: Chair): Rect {
  return {
    x: chair.position.x,
    y: chair.position.y,
    width: chair.widthMm,
    height: chair.depthMm
  };
}

export function tableToRect(table: Table): Rect {
  const width = table.type === "round" ? table.diameterMm ?? table.widthMm : table.widthMm;
  const height = table.type === "round" ? table.diameterMm ?? table.depthMm : table.depthMm;
  const position = getTablePosition(table);
  return {
    x: position.x,
    y: position.y,
    width,
    height
  };
}

export function tableSeatToRect(seat: TableSeat): Rect {
  return {
    x: seat.x ?? seat.position.x,
    y: seat.y ?? seat.position.y,
    width: seat.widthMm,
    height: seat.depthMm
  };
}

export function generatedAisleToRect(object: DrawingObject): Rect {
  return objectToRect(object);
}

export function getTablePosition(table: Table): Point {
  return {
    x: table.x ?? table.position.x,
    y: table.y ?? table.position.y
  };
}

export function isRectInsideRoom(rect: Rect, plan: Pick<Plan, "room">): boolean {
  return rectInsideRect(rect, objectToRect(plan.room));
}

export function isChairInsideRoom(chair: Chair, plan: Pick<Plan, "room">): boolean {
  return isRectInsideRoom(chairToRect(chair), plan);
}

export function isTableInsideRoom(table: Table, plan: Pick<Plan, "room">): boolean {
  return isRectInsideRoom(tableToRect(table), plan);
}

export function objectOverlapsForbiddenArea(rect: Rect, forbiddenAreas: DrawingObject[], safetyDistanceMm = 0): boolean {
  return rectOverlapsAny(
    rect,
    forbiddenAreas.filter((area) => area.visible !== false).map((area) => expandRect(objectToRect(area), safetyDistanceMm))
  );
}

export function rectOverlapsAny(rect: Rect, others: Rect[]): boolean {
  return others.some((other) => rectsOverlap(rect, other));
}

export function rectIntersectsAny(rect: Rect, others: Rect[]): boolean {
  return rectOverlapsAny(rect, others);
}

export function filterBlockedRects(rects: Rect[], blockedRects: Rect[], safetyDistanceMm = 0): Rect[] {
  const expanded = blockedRects.map((rect) => expandRect(rect, safetyDistanceMm));
  return rects.filter((rect) => !rectOverlapsAny(rect, expanded));
}

export function findFreeGridPositions({
  area,
  blockedRects,
  itemSize,
  pitch,
  limit
}: {
  area: Rect;
  blockedRects: Rect[];
  itemSize: { width: number; height: number };
  pitch: { x: number; y: number };
  limit?: number;
}): Point[] {
  const positions: Point[] = [];
  for (let y = area.y; y + itemSize.height <= area.y + area.height; y += pitch.y) {
    for (let x = area.x; x + itemSize.width <= area.x + area.width; x += pitch.x) {
      const rect = { x, y, width: itemSize.width, height: itemSize.height };
      if (!rectOverlapsAny(rect, blockedRects)) {
        positions.push({ x, y });
        if (limit && positions.length >= limit) {
          return positions;
        }
      }
    }
  }
  return positions;
}

export function getRoomRect(plan: Pick<Plan, "room">): Rect {
  return objectToRect(plan.room);
}

export function getForbiddenRectsFromPlan(
  plan: Pick<Plan, "objects" | "tables" | "tableSeats">,
  options: { includeRoles?: DrawingObject["role"][]; excludeObjectIds?: string[]; includeTables?: boolean; includeTableSeats?: boolean; safetyDistanceMm?: number } = {}
): Rect[] {
  const defaultRoles: DrawingObject["role"][] = [
    "stage",
    "foh",
    "escape_route",
    "exit",
    "no_seat_zone",
    "stairs",
    "stage_access",
    "technical_area",
    "wheelchair_area",
    "table_area",
    "generated_aisle"
  ];
  const roles = new Set(options.includeRoles ?? defaultRoles);
  const excluded = new Set(options.excludeObjectIds ?? []);
  const safety = options.safetyDistanceMm ?? 0;
  const objectRects = plan.objects
    .filter((object) => object.visible !== false && !excluded.has(object.id) && roles.has(object.role))
    .map((object) => expandRect(objectToRect(object), safety));
  const tableRects = options.includeTables === false ? [] : plan.tables.map((table) => expandRect(tableToRect(table), safety));
  const tableSeatRects = options.includeTableSeats ? plan.tableSeats.map((seat) => expandRect(tableSeatToRect(seat), safety)) : [];
  return [...objectRects, ...tableRects, ...tableSeatRects];
}

export function mmToCanvasPx(valueMm: number, scale: number): number {
  return valueMm * scale;
}

export function canvasPxToMm(valuePx: number, scale: number): number {
  return valuePx / scale;
}

export function distanceBetweenRects(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0);
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0);
  return Math.sqrt(dx * dx + dy * dy);
}

export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

export function getBoundingRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) {
    return null;
  }
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getRectsBoundingBox(rects: Rect[]): Rect | null {
  return getBoundingRect(rects);
}

export function isRectInsideSelection(rect: Rect, selection: Rect): boolean {
  return rectInsideRect(rect, selection);
}

export function rectIntersectsSelection(rect: Rect, selection: Rect): boolean {
  return rectsOverlap(rect, selection);
}

export function snapValueToGrid(value: number, gridSizeMm: number): number {
  if (gridSizeMm <= 0) {
    return value;
  }
  return Math.round(value / gridSizeMm) * gridSizeMm;
}

export function snapPointToGrid(point: Point, gridSizeMm: number): Point {
  return {
    x: snapValueToGrid(point.x, gridSizeMm),
    y: snapValueToGrid(point.y, gridSizeMm)
  };
}

export function snapRectToGrid(rect: Rect, gridSizeMm: number): Rect {
  return {
    x: snapValueToGrid(rect.x, gridSizeMm),
    y: snapValueToGrid(rect.y, gridSizeMm),
    width: Math.max(gridSizeMm, snapValueToGrid(rect.width, gridSizeMm)),
    height: Math.max(gridSizeMm, snapValueToGrid(rect.height, gridSizeMm))
  };
}
