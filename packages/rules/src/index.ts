import { chairOverlapsForbiddenArea, isChairInsideRoom } from "@seatflow/geometry";
import type { DrawingObject, Plan, ValidationMessage, ValidationResult } from "@seatflow/types";

export function validatePlan(plan: Plan): ValidationResult {
  const messages: ValidationMessage[] = [];
  const forbiddenAreaCandidates: Array<DrawingObject | undefined> = [
    plan.stage,
    plan.foh,
    ...plan.noSeatZones,
    ...plan.escapeRoutes
  ];
  const forbiddenAreas = forbiddenAreaCandidates.filter((area): area is DrawingObject => Boolean(area));

  for (const chair of plan.chairs) {
    if (!isChairInsideRoom(chair, plan.room)) {
      messages.push({
        id: `chair-outside-${chair.id}`,
        severity: "error",
        objectId: chair.id,
        message: `Stuhl ${chair.id} liegt außerhalb des Raums.`
      });
    }

    if (chairOverlapsForbiddenArea(chair, forbiddenAreas)) {
      messages.push({
        id: `chair-forbidden-${chair.id}`,
        severity: "error",
        objectId: chair.id,
        message: `Stuhl ${chair.id} überschneidet eine Sperrfläche oder einen Fluchtweg.`
      });
    }

    if (chair.widthMm < plan.ruleProfile.minSeatWidthMm) {
      messages.push({
        id: `chair-width-${chair.id}`,
        severity: "warning",
        objectId: chair.id,
        message: `Stuhl ${chair.id} ist schmaler als die Mindestbreite.`
      });
    }
  }

  for (const route of plan.escapeRoutes) {
    if (route.widthMm < plan.ruleProfile.minAisleWidthMm) {
      messages.push({
        id: `aisle-width-${route.id}`,
        severity: "error",
        objectId: route.id,
        message: `${route.name} ist schmaler als ${plan.ruleProfile.minAisleWidthMm} mm.`
      });
    }
  }

  return {
    valid: messages.every((message) => message.severity !== "error"),
    messages
  };
}
