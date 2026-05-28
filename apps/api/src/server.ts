import cors from "@fastify/cors";
import { createDemoPlan, generateSeating } from "@seatflow/planner-core";
import { validatePlan } from "@seatflow/rules";
import type { Plan } from "@seatflow/types";
import Fastify from "fastify";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: true
});

server.get("/health", async () => ({
  status: "ok",
  service: "seatflow-api"
}));

server.get("/demo-plan", async () => {
  const plan = createDemoPlan();
  const validationResult = validatePlan(plan);
  return {
    ...plan,
    validationResult
  };
});

server.post<{ Body: Plan }>("/generate-seating", async (request) => {
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

server.post<{ Body: Plan }>("/validate-plan", async (request) => validatePlan(request.body));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await server.listen({ port, host });
