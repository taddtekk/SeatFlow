import {
  chairToRect,
  distanceBetweenRects,
  objectOverlapsForbiddenArea,
  objectToRect,
  rectInsideRect,
  rectsOverlap,
  tableSeatToRect,
  tableToRect
} from "@seatflow/geometry";
import type { DrawingObject, Plan, Rect, RuleProfile, ValidationMessage, ValidationResult } from "@seatflow/types";

export function validatePlan(plan: Plan, ruleProfile: RuleProfile = plan.ruleProfile): ValidationResult {
  const messages: ValidationMessage[] = [];
  const roomRect = objectToRect(plan.room);
  const stageFohAndZones = plan.objects.filter((object) => ["stage", "foh", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area", "table_area", "generated_aisle"].includes(object.role));
  const forbidden = plan.objects.filter((object) => ["stage", "foh", "escape_route", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role));
  const escapeRoutes = plan.objects.filter((object) => object.role === "escape_route");
  const exits = plan.objects.filter((object) => object.role === "exit");
  const seatingAreas = plan.objects.filter((object) => object.role === "seating_area");
  const blockingZones = plan.objects.filter((object) => ["stage", "foh", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role));

  for (const object of plan.objects) {
    const rect = objectToRect(object);
    if (!rectInsideRect(rect, roomRect)) {
      messages.push(error("OBJECT_OUTSIDE_ROOM", object, `${object.name} liegt außerhalb des Raums.`));
    }
  }

  for (const chair of plan.chairs) {
    const chairRect = chairToRect(chair);
    if (!rectInsideRect(chairRect, roomRect)) {
      messages.push(entityError("CHAIR_OUTSIDE_ROOM", chair.id, `Stuhl ${chair.id}`, `Stuhl ${chair.id} liegt außerhalb des Raums.`));
    }
    for (const area of stageFohAndZones) {
      if (rectsOverlap(chairRect, objectToRect(area))) {
        messages.push(entityError("CHAIR_OVERLAPS_FORBIDDEN_AREA", chair.id, `Stuhl ${chair.id}`, `Stuhl ${chair.id} überschneidet ${area.name}.`, { areaId: area.id }));
      }
    }
    for (const route of escapeRoutes) {
      if (rectsOverlap(chairRect, objectToRect(route))) {
        messages.push(entityError("CHAIR_OVERLAPS_ESCAPE_ROUTE", chair.id, `Stuhl ${chair.id}`, `Stuhl ${chair.id} überschneidet einen Fluchtweg.`, { routeId: route.id }));
      }
    }
    for (const table of plan.tables) {
      if (rectsOverlap(chairRect, tableToRect(table))) {
        messages.push(entityError("CHAIR_OVERLAPS_TABLE", chair.id, `Stuhl ${chair.id}`, `Stuhl ${chair.id} überschneidet ${table.name}.`, { tableId: table.id }));
      }
    }
    if (chair.widthMm < ruleProfile.minSeatWidthMm) {
      messages.push(entityWarning("CHAIR_TOO_NARROW", chair.id, `Stuhl ${chair.id}`, `Stuhl ${chair.id} ist schmaler als ${ruleProfile.minSeatWidthMm} mm.`));
    }
    if (chair.seatingAreaId) {
      const area = seatingAreas.find((item) => item.id === chair.seatingAreaId);
      if (area && !rectInsideRect(chairRect, objectToRect(area))) {
        messages.push(entityError("CHAIR_OUTSIDE_SEATING_AREA", chair.id, `Stuhl ${chair.label ?? chair.id}`, `Stuhl ${chair.label ?? chair.id} liegt außerhalb seines Bestuhlungsbereichs.`, { seatingAreaId: area.id }));
      }
    }
  }

  for (const block of plan.seatingBlocks) {
    const blockRect = block.bounds ?? rectFromChairs(block.chairs);
    if (!blockRect) {
      continue;
    }
    if (escapeRoutes.length > 0 && escapeRoutes.every((route) => distanceBetweenRects(blockRect, objectToRect(route)) > ruleProfile.minAisleWidthMm * 2)) {
      messages.push(entityWarning("SEATING_BLOCK_WITHOUT_ESCAPE_ROUTE_CONNECTION", block.id, block.name, `${block.name} hat keine einfache Verbindung zu einem Fluchtweg.`));
    }
    if (blockingZones.some((zone) => rectsOverlap(blockRect, objectToRect(zone)))) {
      messages.push(entityError("SEATING_BLOCK_OVERLAPS_FORBIDDEN_AREA", block.id, block.name, `${block.name} überschneidet eine Sperrfläche.`));
    }
    if (block.rowCount > ruleProfile.maxRowsPerBlock) {
      messages.push(entityWarning("SEATING_BLOCK_TOO_MANY_ROWS", block.id, block.name, `${block.name} hat mehr als ${ruleProfile.maxRowsPerBlock} Reihen.`));
    }
    const maxSeatsInRow = maxSeatsPerRow(block.chairs);
    if (maxSeatsInRow > ruleProfile.maxSeatsBetweenTwoAisles) {
      messages.push(entityWarning("SEATING_ROW_TOO_LONG", block.id, block.name, `${block.name} hat eine Reihe mit ${maxSeatsInRow} Sitzen bis zum nächsten Gang.`));
    }
  }

  for (const table of plan.tables) {
    const tableRect = tableToRect(table);
    if (!rectInsideRect(tableRect, roomRect)) {
      messages.push(entityError("TABLE_OUTSIDE_ROOM", table.id, table.name, `${table.name} liegt außerhalb des Raums.`));
    }
    if (objectOverlapsForbiddenArea(tableRect, forbidden, ruleProfile.minTableToEscapeRouteDistanceMm)) {
      messages.push(entityError("TABLE_OVERLAPS_FORBIDDEN_AREA", table.id, table.name, `${table.name} überschneidet eine Sperrfläche oder einen Fluchtweg.`));
    }
    for (const route of escapeRoutes) {
      if (distanceBetweenRects(tableRect, objectToRect(route)) < ruleProfile.minTableToEscapeRouteDistanceMm) {
        messages.push(entityWarning("TABLE_TOO_CLOSE_TO_ESCAPE_ROUTE", table.id, table.name, `${table.name} steht näher als ${ruleProfile.minTableToEscapeRouteDistanceMm} mm an einem Fluchtweg.`, { routeId: route.id }));
      }
    }
  }

  for (let outer = 0; outer < plan.tables.length; outer += 1) {
    for (let inner = outer + 1; inner < plan.tables.length; inner += 1) {
      const a = plan.tables[outer];
      const b = plan.tables[inner];
      if (!a || !b) {
        continue;
      }
      if (distanceBetweenRects(tableToRect(a), tableToRect(b)) < ruleProfile.minTableDistanceMm) {
        messages.push(entityWarning("TABLE_DISTANCE_TOO_SMALL", a.id, a.name, `${a.name} und ${b.name} stehen näher als ${ruleProfile.minTableDistanceMm} mm zusammen.`, { otherTableId: b.id }));
      }
    }
  }

  for (const route of escapeRoutes) {
    const routeRect = objectToRect(route);
    const width = Math.min(routeRect.width, routeRect.height);
    if (width < ruleProfile.minAisleWidthMm) {
      messages.push(error("ESCAPE_ROUTE_TOO_NARROW", route, `${route.name} ist schmaler als ${ruleProfile.minAisleWidthMm} mm.`));
    }
    if (isRouteBlocked(routeRect, plan, route.id)) {
      messages.push(error("ESCAPE_ROUTE_BLOCKED", route, `${route.name} wird durch ein Objekt, einen Stuhl oder Tisch blockiert.`));
    }
    if (exits.length > 0 && exits.every((exit) => distanceBetweenRects(routeRect, objectToRect(exit)) > 1000)) {
      messages.push(warning("ESCAPE_ROUTE_WITHOUT_EXIT", route, `${route.name} endet ohne direkt erkannten Ausgang.`));
    }
  }

  for (const exit of exits) {
    const exitRect = objectToRect(exit);
    if (!rectInsideRect(exitRect, roomRect)) {
      messages.push(error("EXIT_OUTSIDE_ROOM", exit, `${exit.name} liegt außerhalb des Raums.`));
    }
    if (isExitBlocked(exitRect, plan, exit.id)) {
      messages.push(error("EXIT_BLOCKED", exit, `${exit.name} wird durch ein Objekt, einen Stuhl oder Tisch blockiert.`));
    }
    if (escapeRoutes.length > 0 && escapeRoutes.every((route) => distanceBetweenRects(exitRect, objectToRect(route)) > 1000)) {
      messages.push(warning("EXIT_WITHOUT_ESCAPE_ROUTE", exit, `${exit.name} ist keinem Fluchtweg einfach zugeordnet.`));
    }
  }

  for (const seat of plan.tableSeats) {
    const seatRect = tableSeatToRect(seat);
    if (!rectInsideRect(seatRect, roomRect)) {
      messages.push(entityError("TABLE_SEAT_OUTSIDE_ROOM", seat.id, `Tischsitz ${seat.id}`, `Tischsitz ${seat.id} liegt außerhalb des Raums.`));
    }
    for (const route of escapeRoutes) {
      if (rectsOverlap(seatRect, objectToRect(route))) {
        messages.push(entityError("TABLE_SEAT_OVERLAPS_ESCAPE_ROUTE", seat.id, `Tischsitz ${seat.id}`, `Tischsitz ${seat.id} überschneidet einen Fluchtweg.`, { routeId: route.id }));
      }
    }
    for (const area of blockingZones) {
      if (rectsOverlap(seatRect, objectToRect(area))) {
        messages.push(entityError("TABLE_SEAT_OVERLAPS_FORBIDDEN_AREA", seat.id, `Tischsitz ${seat.id}`, `Tischsitz ${seat.id} überschneidet ${area.name}.`, { areaId: area.id }));
      }
    }
  }

  return {
    valid: messages.every((message) => message.severity !== "error"),
    messages
  };
}

function isRouteBlocked(routeRect: Rect, plan: Plan, routeId: string): boolean {
  return (
    plan.chairs.some((chair) => rectsOverlap(routeRect, chairToRect(chair))) ||
    plan.tables.some((table) => rectsOverlap(routeRect, tableToRect(table))) ||
    plan.objects.some((object) => object.id !== routeId && !["exit", "escape_route", "seating_area", "table_area", "generated_aisle"].includes(object.role) && rectsOverlap(routeRect, objectToRect(object)))
  );
}

function isExitBlocked(exitRect: Rect, plan: Plan, exitId: string): boolean {
  return (
    plan.chairs.some((chair) => rectsOverlap(exitRect, chairToRect(chair))) ||
    plan.tables.some((table) => rectsOverlap(exitRect, tableToRect(table))) ||
    plan.objects.some((object) => object.id !== exitId && !["escape_route", "seating_area", "table_area", "generated_aisle"].includes(object.role) && rectsOverlap(exitRect, objectToRect(object)))
  );
}

function error(code: string, object: DrawingObject, message: string, details?: Record<string, unknown>): ValidationMessage {
  return entityMessage("error", code, object.id, object.name, message, details);
}

function warning(code: string, object: DrawingObject, message: string, details?: Record<string, unknown>): ValidationMessage {
  return entityMessage("warning", code, object.id, object.name, message, details);
}

function entityError(code: string, objectId: string, objectName: string, message: string, details?: Record<string, unknown>): ValidationMessage {
  return entityMessage("error", code, objectId, objectName, message, details);
}

function entityWarning(code: string, objectId: string, objectName: string, message: string, details?: Record<string, unknown>): ValidationMessage {
  return entityMessage("warning", code, objectId, objectName, message, details);
}

function entityMessage(
  severity: ValidationMessage["severity"],
  code: string,
  objectId: string,
  objectName: string,
  message: string,
  details?: Record<string, unknown>
): ValidationMessage {
  const detailKey = details ? `-${Object.values(details).map(String).join("-")}` : "";
  const objectRole = getObjectRole(details);
  return {
    id: `${code.toLowerCase()}-${objectId}${detailKey}`,
    severity,
    objectId,
    objectName,
    ...(objectRole ? { objectRole } : {}),
    code,
    message,
    ...(details ? { details } : {})
  };
}

function rectFromChairs(chairs: Plan["chairs"]): Rect | null {
  if (chairs.length === 0) {
    return null;
  }
  const rects = chairs.map(chairToRect);
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function maxSeatsPerRow(chairs: Plan["chairs"]): number {
  const counts = new Map<number, number>();
  for (const chair of chairs) {
    const row = chair.rowIndex ?? 0;
    counts.set(row, (counts.get(row) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function getObjectRole(details?: Record<string, unknown>): ValidationMessage["objectRole"] | undefined {
  const role = details?.objectRole;
  return typeof role === "string" ? (role as ValidationMessage["objectRole"]) : undefined;
}
