import {
  chairToRect,
  distanceBetweenRects,
  objectOverlapsForbiddenArea,
  objectToRect,
  rectInsideRect,
  rectsOverlap,
  tableToRect
} from "@seatflow/geometry";
import type { DrawingObject, Plan, RuleProfile, ValidationMessage, ValidationResult } from "@seatflow/types";

export function validatePlan(plan: Plan, ruleProfile: RuleProfile = plan.ruleProfile): ValidationResult {
  const messages: ValidationMessage[] = [];
  const roomRect = objectToRect(plan.room);
  const forbidden = plan.objects.filter((object) =>
    ["stage", "foh", "escape_route", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)
  );
  const escapeRoutes = plan.objects.filter((object) => object.role === "escape_route");
  const noSeatZones = plan.objects.filter((object) =>
    ["stage", "foh", "no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)
  );

  for (const object of plan.objects) {
    const rect = objectToRect(object);
    if (!rectInsideRect(rect, roomRect)) {
      messages.push(error(`object-outside-${object.id}`, object.id, `${object.name} liegt außerhalb des Raums.`));
    }
  }

  for (const chair of plan.chairs) {
    const chairRect = chairToRect(chair);
    if (!rectInsideRect(chairRect, roomRect)) {
      messages.push(error(`chair-outside-${chair.id}`, chair.id, `Stuhl ${chair.id} liegt außerhalb des Raums.`));
    }
    for (const area of noSeatZones) {
      if (rectsOverlap(chairRect, objectToRect(area))) {
        messages.push(error(`chair-area-${chair.id}-${area.id}`, chair.id, `Stuhl ${chair.id} überschneidet ${area.name}.`));
      }
    }
    for (const route of escapeRoutes) {
      if (rectsOverlap(chairRect, objectToRect(route))) {
        messages.push(error(`chair-route-${chair.id}-${route.id}`, chair.id, `Stuhl ${chair.id} überschneidet einen Fluchtweg.`));
      }
    }
    if (chair.widthMm < ruleProfile.minSeatWidthMm) {
      messages.push(warning(`chair-width-${chair.id}`, chair.id, `Stuhl ${chair.id} ist schmaler als ${ruleProfile.minSeatWidthMm} mm.`));
    }
  }

  for (const table of plan.tables) {
    const tableRect = tableToRect(table);
    if (!rectInsideRect(tableRect, roomRect)) {
      messages.push(error(`table-outside-${table.id}`, table.id, `${table.name} liegt außerhalb des Raums.`));
    }
    if (objectOverlapsForbiddenArea(tableRect, forbidden, ruleProfile.minTableToEscapeRouteDistanceMm)) {
      messages.push(error(`table-forbidden-${table.id}`, table.id, `${table.name} überschneidet eine Sperrfläche oder einen Fluchtweg.`));
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
        messages.push(warning(`table-distance-${a.id}-${b.id}`, a.id, `${a.name} und ${b.name} stehen näher als ${ruleProfile.minTableDistanceMm} mm zusammen.`));
      }
    }
  }

  for (const route of escapeRoutes) {
    const width = objectToRect(route).width;
    if (width < ruleProfile.minAisleWidthMm) {
      messages.push(error(`route-width-${route.id}`, route.id, `${route.name} ist schmaler als ${ruleProfile.minAisleWidthMm} mm.`));
    }
  }

  return {
    valid: messages.every((message) => message.severity !== "error"),
    messages
  };
}

function error(id: string, objectId: string, message: string): ValidationMessage {
  return { id, objectId, severity: "error", message };
}

function warning(id: string, objectId: string, message: string): ValidationMessage {
  return { id, objectId, severity: "warning", message };
}
