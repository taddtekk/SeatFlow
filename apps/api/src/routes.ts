import { exportPlanPdf } from "@seatflow/export";
import { generateSeating, generateTableLayout } from "@seatflow/planner-core";
import type { RepositoryServices } from "@seatflow/repositories";
import { validatePlan } from "@seatflow/rules";
import type { Plan } from "@seatflow/types";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./config";

export async function registerApiRoutes(server: FastifyInstance, repositories: RepositoryServices, config: AppConfig) {
  server.get("/api/health", async () => ({
    status: "ok",
    app: "SeatFlow",
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  }));

  server.get("/api/demo-plan", async () => repositories.plans.getDemoPlan());

  server.get<{ Params: { id: string } }>("/api/plans/:id", async (request, reply) => {
    const plan = await repositories.plans.findById(request.params.id);
    if (!plan) {
      reply.code(404);
      return { message: "Plan nicht gefunden." };
    }
    return plan;
  });

  server.put<{ Params: { id: string }; Body: Plan }>("/api/plans/:id", async (request) => {
    return repositories.plans.save({ ...request.body, id: request.params.id, updatedAtIso: new Date().toISOString() });
  });

  server.post<{ Body: Plan }>("/api/generate-seating", async (request) => {
    const result = generateSeating(request.body);
    const plan: Plan = {
      ...request.body,
      chairs: result.chairs,
      seatingBlocks: result.seatingBlocks,
      updatedAtIso: new Date().toISOString()
    };
    return { ...plan, validationResult: validatePlan(plan), generationWarnings: result.warnings };
  });

  server.post<{ Body: Plan }>("/api/generate-table-layout", async (request) => {
    const result = generateTableLayout(request.body);
    const plan: Plan = {
      ...request.body,
      tableGroups: result.tableGroups,
      tables: result.tables,
      tableSeats: result.tableSeats,
      updatedAtIso: new Date().toISOString()
    };
    return { ...plan, validationResult: validatePlan(plan), generationWarnings: result.warnings };
  });

  server.post<{ Body: Plan }>("/api/validate-plan", async (request) => validatePlan(request.body));

  server.post<{ Body: Plan }>("/api/export/pdf", async (request) => {
    const validationResult = validatePlan(request.body);
    const result = await exportPlanPdf(request.body, validationResult, {
      publicDir: config.publicDir,
      exportDir: config.exportDir,
      appBaseUrl: config.appBaseUrl
    });
    return repositories.exports.save(result);
  });
}
