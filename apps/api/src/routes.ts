import { createDemoPlan, generateSeating } from "@seatflow/planner-core";
import { validatePlan } from "@seatflow/rules";
import type { Plan } from "@seatflow/types";
import type { FastifyInstance } from "fastify";

export async function registerApiRoutes(server: FastifyInstance, prefix = "") {
  server.get(`${prefix}/health`, async () => ({
    status: "ok",
    service: "seatflow-api"
  }));

  server.get(`${prefix}/demo-plan`, async () => {
    const plan = createDemoPlan();
    const validationResult = validatePlan(plan);
    return {
      ...plan,
      validationResult
    };
  });

  server.post<{ Body: Plan }>(`${prefix}/generate-seating`, async (request) => {
    const plan = request.body;
    const seatingBlock = generateSeating({
      room: plan.room,
      noSeatZones: plan.noSeatZones,
      escapeRoutes: plan.escapeRoutes,
      ruleProfile: plan.ruleProfile,
      ...(plan.stage ? { stage: plan.stage } : {}),
      ...(plan.foh ? { foh: plan.foh } : {})
    });

    const nextPlan: Plan = {
      ...plan,
      chairs: seatingBlock.chairs,
      seatingBlocks: [seatingBlock]
    };

    return {
      ...nextPlan,
      validationResult: validatePlan(nextPlan)
    };
  });

  server.post<{ Body: Plan }>(`${prefix}/validate-plan`, async (request) => validatePlan(request.body));
}
