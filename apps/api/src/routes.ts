import { exportPlanPdf } from "@seatflow/export";
import { generateLayouts, generateSeating, generateTableLayout, type GenerateLayoutsOptions, type GenerateSeatingOptions, type GenerateTableLayoutOptions } from "@seatflow/planner-core";
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
        lastSavedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    const seating = mergeSeating(bodyPlan, result, options);
    const plan: Plan = {
      ...bodyPlan,
      objects: seating.objects,
      chairs: seating.chairs,
      seatingBlocks: seating.seatingBlocks,
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    };
    const validationResult = validatePlan(plan);
    return { ...plan, validationResult, validationResults: validationResult, generationWarnings: result.warnings, generationStats: result.stats };
  });

  server.post<{ Body: PlanRequestBody<GenerateTableLayoutOptions> }>("/api/generate-table-layout", async (request, reply) => {
    const { plan: bodyPlan, options } = parsePlanRequest(request.body);
    if (!bodyPlan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    const result = generateTableLayout(bodyPlan, options);
    const tableLayout = mergeTableLayout(bodyPlan, result, options);
    const plan: Plan = {
      ...bodyPlan,
      tableGroups: tableLayout.tableGroups,
      tables: tableLayout.tables,
      tableSeats: tableLayout.tableSeats,
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    };
    const validationResult = validatePlan(plan);
    return { ...plan, validationResult, validationResults: validationResult, generationWarnings: result.warnings, generationStats: result.stats };
  });

  server.post<{ Body: PlanRequestBody<GenerateLayoutsOptions> }>("/api/generate-layouts", async (request, reply) => {
    const { plan: bodyPlan, options } = parsePlanRequest(request.body);
    if (!bodyPlan) {
      reply.code(400);
      return { message: "Es wurde kein gueltiger Plan uebergeben." };
    }
    const result = generateLayouts(bodyPlan, options);
    const plan: Plan = {
      ...result.plan,
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    };
    const validationResult = validatePlan(plan);
    return {
      plan: { ...plan, validationResult, validationResults: validationResult },
      seatingResult: result.seatingResult,
      tableLayoutResult: result.tableLayoutResult,
      validationResults: validationResult,
      stats: result.stats
    };
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

function replaceGeneratedAisles(objects: Plan["objects"], generatedAisles: Plan["objects"]): Plan["objects"] {
  return [...objects.filter((object) => object.role !== "generated_aisle" || object.properties?.source !== "seating"), ...generatedAisles];
}

function mergeSeating(plan: Plan, result: ReturnType<typeof generateSeating>, options?: GenerateSeatingOptions): Pick<Plan, "objects" | "chairs" | "seatingBlocks"> {
  const areaIds = options?.areaIds;
  if (!areaIds || areaIds.length === 0) {
    return {
      objects: replaceGeneratedAisles(plan.objects, result.generatedAisles),
      chairs: result.chairs,
      seatingBlocks: result.seatingBlocks
    };
  }
  const areaIdSet = new Set(areaIds);
  return {
    objects: [
      ...plan.objects.filter((object) => object.role !== "generated_aisle" || !areaIdSet.has(String(object.properties?.sourceAreaId ?? ""))),
      ...result.generatedAisles
    ],
    chairs: [...plan.chairs.filter((chair) => !chair.seatingAreaId || !areaIdSet.has(chair.seatingAreaId)), ...result.chairs],
    seatingBlocks: [...plan.seatingBlocks.filter((block) => !block.areaId || !areaIdSet.has(block.areaId)), ...result.seatingBlocks]
  };
}

function mergeTableLayout(plan: Plan, result: ReturnType<typeof generateTableLayout>, options?: GenerateTableLayoutOptions): Pick<Plan, "tables" | "tableSeats" | "tableGroups"> {
  const areaIds = options?.areaIds;
  if (!areaIds || areaIds.length === 0) {
    return {
      tables: result.tables,
      tableSeats: result.tableSeats,
      tableGroups: result.tableGroups
    };
  }
  const areaIdSet = new Set(areaIds);
  const removedTableIds = new Set(plan.tables.filter((table) => table.areaId && areaIdSet.has(table.areaId)).map((table) => table.id));
  return {
    tables: [...plan.tables.filter((table) => !table.areaId || !areaIdSet.has(table.areaId)), ...result.tables],
    tableSeats: [...plan.tableSeats.filter((seat) => !removedTableIds.has(seat.tableId)), ...result.tableSeats],
    tableGroups: [...plan.tableGroups.filter((group) => !areaIdSet.has(String(group.properties?.areaId ?? ""))), ...result.tableGroups]
  };
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
