import type { Chair, DrawingObject, Millimeters, Point, Rect, Room } from "@seatflow/types";

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function chairToRect(chair: Chair): Rect {
  return {
    x: chair.position.x,
    y: chair.position.y,
    width: chair.widthMm,
    height: chair.depthMm
  };
}

export function isChairInsideRoom(chair: Chair, room: Room): boolean {
  const rect = chairToRect(chair);
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= room.widthMm && rect.y + rect.height <= room.heightMm;
}

export function chairOverlapsForbiddenArea(chair: Chair, forbiddenAreas: DrawingObject[]): boolean {
  const chairRect = chairToRect(chair);
  return forbiddenAreas.some((area) => rectsOverlap(chairRect, area.rect));
}

export function mmToCanvasPx(valueMm: Millimeters, scale: number): number {
  return valueMm * scale;
}

export function canvasPxToMm(valuePx: number, scale: number): Millimeters {
  return valuePx / scale;
}
