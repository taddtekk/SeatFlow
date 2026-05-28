import {
  chairToRect,
  distanceBetweenRects,
  objectOverlapsForbiddenArea,
  objectToRect,
  rectInsideRect,
  rectsOverlap,
  tableToRect
} from "@seatflow/geometry";
import type { DrawingObject, Plan, Rect, RuleProfile, ValidationMessage, ValidationResult } from "@seatflow/types";

export function validatePlan(plan: Plan, ruleProfile: RuleProfile = plan.ruleProfile): ValidationResult {
  const messages: ValidationMessage[] = [];
  const roomRect = objectToRect(plan.room);
  const stageFohAndZones = plan.objects.filter((object) => ["stage", "foh", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role));
  const forbidden = plan.objects.filter((object) => ["stage", "foh", "escape_route", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role));
  const escapeRoutes = plan.objects.filter((object) => object.role === "escape_route");
  const exits = plan.objects.filter((object) => object.role === "exit");

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
  }

  for (const table of plan.tables) {
    const tableRect = tableToRect(table);
    if (!rectInsideRect(tableRect, roomRect)) {
      messages.push(entityError("TABLE_OUTSIDE_ROOM", table.id, table.name, `${table.name} liegt außerhalb des Raums.`));
    }
    if (objectOverlapsForbiddenArea(tableRect, forbidden, ruleProfile.minTableToEscapeRouteDistanceMm)) {
      messages.push(entityError("TABLE_OVERLAPS_FORBIDDEN_AREA", table.id, table.name, `${table.name} überschneidet eine Sperrfläche oder einen Fluchtweg.`));
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
  }

  for (const exit of exits) {
    const exitRect = objectToRect(exit);
    if (!rectInsideRect(exitRect, roomRect)) {
      messages.push(error("EXIT_OUTSIDE_ROOM", exit, `${exit.name} liegt außerhalb des Raums.`));
    }
    if (isExitBlocked(exitRect, plan, exit.id)) {
      messages.push(error("EXIT_BLOCKED", exit, `${exit.name} wird durch ein Objekt, einen Stuhl oder Tisch blockiert.`));
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
    plan.objects.some((object) => object.id !== routeId && object.role !== "exit" && object.role !== "escape_route" && rectsOverlap(routeRect, objectToRect(object)))
  );
}

function isExitBlocked(exitRect: Rect, plan: Plan, exitId: string): boolean {
  return (
    plan.chairs.some((chair) => rectsOverlap(exitRect, chairToRect(chair))) ||
    plan.tables.some((table) => rectsOverlap(exitRect, tableToRect(table))) ||
    plan.objects.some((object) => object.id !== exitId && object.role !== "escape_route" && rectsOverlap(exitRect, objectToRect(object)))
  );
}

function error(code: string, object: DrawingObject, message: string, details?: Record<string, unknown>): ValidationMessage {
  return entityMessage("error", code, object.id, object.name, message, details);
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
  return {
    id: `${code.toLowerCase()}-${objectId}${detailKey}`,
    severity,
    objectId,
    objectName,
    code,
    message,
    ...(details ? { details } : {})
  };
}
