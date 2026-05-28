import { exportPlanPdf } from "@seatflow/export";
import { generateSeating, generateTableLayout, type GenerateSeatingOptions, type GenerateTableLayoutOptions } from "@seatflow/planner-core";
import type { RepositoryServices } from "@seatflow/repositories";
import { validatePlan } from "@seatflow/rules";
import type { Plan } from "@seatflow/types";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./config";

type PlanRequestBody<TOptions = unknown> = Plan | { plan: Plan; options?: TOptions };

export async function registerApiRoutes(server: FastifyInstance, repositories: RepositoryServices, config: AppConfig) {
  server.get("/api/health", async () => ({
    status: "ok",
    app: "SeatFlow",
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  }));

  server.get("/api/demo-plan", async (_request, reply) => {
    try {
      return await repositories.plans.getDemoPlan();
    } catch {
      reply.code(500);
      return { message: "Demo-Plan konnte nicht geladen werden." };
    }
  });

  server.get<{ Params: { id: string } }>("/api/plans/:id", async (request, reply) => {
    const plan = await repositories.plans.findById(request.params.id);
    if (!plan) {
      reply.code(404);
      return { message: "Plan nicht gefunden." };
    }
    return plan;
  });

  server.put<{ Params: { id: string }; Body: Plan }>("/api/plans/:id", async (request, reply) => {
    try {
      return await repositories.plans.save({
        ...request.body,
        id: request.params.id,
        metadata: {
          ...(request.body.metadata ?? {}),
          savedAtIso: new Date().toISOString()
        },
        updatedAtIso: new Date().toISOString()
      });
    } catch {
      reply.code(500);
      return { message: "Plan konnte nicht gespeichert werden." };
    }
  });

  server.post<{ Body: PlanRequestBody<GenerateSeatingOptions> }>("/api/generate-seating", async (request, reply) => {
    const { plan: bodyPlan, options } = parsePlanRequest(request.body);
    if (!bodyPlan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    const result = generateSeating(bodyPlan, options);
    const plan: Plan = {
      ...bodyPlan,
      chairs: result.chairs,
      seatingBlocks: result.seatingBlocks,
      updatedAtIso: new Date().toISOString()
    };
    const validationResult = validatePlan(plan);
    return { ...plan, validationResult, validationResults: validationResult, generationWarnings: result.warnings };
  });

  server.post<{ Body: PlanRequestBody<GenerateTableLayoutOptions> }>("/api/generate-table-layout", async (request, reply) => {
    const { plan: bodyPlan, options } = parsePlanRequest(request.body);
    if (!bodyPlan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    const result = generateTableLayout(bodyPlan, options);
    const plan: Plan = {
      ...bodyPlan,
      tableGroups: result.tableGroups,
      tables: result.tables,
      tableSeats: result.tableSeats,
      updatedAtIso: new Date().toISOString()
    };
    const validationResult = validatePlan(plan);
    return { ...plan, validationResult, validationResults: validationResult, generationWarnings: result.warnings };
  });

  server.post<{ Body: PlanRequestBody }>("/api/validate-plan", async (request, reply) => {
    const { plan } = parsePlanRequest(request.body);
    if (!plan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    return validatePlan(plan);
  });

  server.post<{ Body: PlanRequestBody }>("/api/export/pdf", async (request, reply) => {
    const { plan } = parsePlanRequest(request.body);
    if (!plan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    const validationResult = validatePlan(plan);
    const result = await exportPlanPdf(plan, validationResult, {
      publicDir: config.publicDir,
      exportDir: config.exportDir,
      appBaseUrl: config.appBaseUrl
    });
    return repositories.exports.save(result);
  });
}

function parsePlanRequest<TOptions>(body: PlanRequestBody<TOptions>): { plan: Plan | null; options?: TOptions } {
  if (isPlan(body)) {
    return { plan: body };
  }
  if (body && typeof body === "object" && "plan" in body && isPlan(body.plan)) {
    return {
      plan: body.plan,
      ...("options" in body && body.options !== undefined ? { options: body.options } : {})
    };
  }
  return { plan: null };
}

function isPlan(value: unknown): value is Plan {
  return Boolean(value && typeof value === "object" && "id" in value && "room" in value && "objects" in value);
}
