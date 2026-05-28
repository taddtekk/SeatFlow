import type { Chair, DrawingObject, Geometry, Plan, Point, Rect, Table } from "@seatflow/types";

export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectInsideRect(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

export function expandRect(rect: Rect, amountMm: number): Rect {
  return {
    x: rect.x - amountMm,
    y: rect.y - amountMm,
    width: rect.width + amountMm * 2,
    height: rect.height + amountMm * 2
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
