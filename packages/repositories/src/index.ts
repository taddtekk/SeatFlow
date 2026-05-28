import { generateSeating, generateTableLayout } from "@seatflow/planner-core";
import { validatePlan } from "@seatflow/rules";
import type {
  DrawingObject,
  ExportRepository,
  ExportResult,
  Plan,
  PlanRepository,
  Project,
  ProjectRepository,
  RepositoryConfig,
  RuleProfile,
  RuleProfileRepository
} from "@seatflow/types";

export interface RepositoryServices {
  plans: PlanRepository;
  projects: ProjectRepository;
  ruleProfiles: RuleProfileRepository;
  exports: ExportRepository;
}

export function createRepositories(config: RepositoryConfig): RepositoryServices {
  if (config.storageDriver === "mariadb") {
    throw new Error("MariaDB ist architektonisch vorbereitet, aber in diesem MVP noch nicht implementiert.");
  }

  const demoPlan = createDemoPlan();
  return {
    plans: new InMemoryPlanRepository([demoPlan]),
    projects: new InMemoryProjectRepository([
      {
        id: "project-demo",
        name: "Demo-Veranstaltung",
        status: "draft",
        createdAtIso: demoPlan.updatedAtIso,
        updatedAtIso: demoPlan.updatedAtIso
      }
    ]),
    ruleProfiles: new InMemoryRuleProfileRepository([demoPlan.ruleProfile]),
    exports: new InMemoryExportRepository()
  };
}

export class InMemoryPlanRepository implements PlanRepository {
  private readonly plans = new Map<string, Plan>();

  constructor(initialPlans: Plan[] = []) {
    for (const plan of initialPlans) {
      this.plans.set(plan.id, clone(plan));
    }
  }

  async getDemoPlan(): Promise<Plan> {
    const plan = this.plans.get("plan-demo") ?? createDemoPlan();
    this.plans.set(plan.id, clone(plan));
    return clone(plan);
  }

  async findById(id: string): Promise<Plan | null> {
    const plan = this.plans.get(id);
    return plan ? clone(plan) : null;
  }

  async save(plan: Plan): Promise<Plan> {
    this.plans.set(plan.id, clone(plan));
    return clone(plan);
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();
  constructor(initial: Project[] = []) {
    for (const project of initial) {
      this.projects.set(project.id, clone(project));
    }
  }
  async findById(id: string): Promise<Project | null> {
    const project = this.projects.get(id);
    return project ? clone(project) : null;
  }
  async list(): Promise<Project[]> {
    return Array.from(this.projects.values()).map(clone);
  }
  async save(project: Project): Promise<Project> {
    this.projects.set(project.id, clone(project));
    return clone(project);
  }
}

export class InMemoryRuleProfileRepository implements RuleProfileRepository {
  private readonly profiles = new Map<string, RuleProfile>();
  constructor(initial: RuleProfile[] = []) {
    for (const profile of initial) {
      this.profiles.set(profile.id, clone(profile));
    }
  }
  async getDefault(): Promise<RuleProfile> {
    return clone(Array.from(this.profiles.values())[0] ?? createDefaultRuleProfile());
  }
  async list(): Promise<RuleProfile[]> {
    return Array.from(this.profiles.values()).map(clone);
  }
  async save(ruleProfile: RuleProfile): Promise<RuleProfile> {
    this.profiles.set(ruleProfile.id, clone(ruleProfile));
    return clone(ruleProfile);
  }
}

export class InMemoryExportRepository implements ExportRepository {
  private readonly exports = new Map<string, ExportResult>();
  async save(result: ExportResult): Promise<ExportResult> {
    this.exports.set(result.id, clone(result));
    return clone(result);
  }
  async findById(id: string): Promise<ExportResult | null> {
    const result = this.exports.get(id);
    return result ? clone(result) : null;
  }
  async listByPlanId(planId: string): Promise<ExportResult[]> {
    return Array.from(this.exports.values()).filter((result) => result.planId === planId).map(clone);
  }
}

export class MariaDbPlanRepository extends InMemoryPlanRepository {}
export class MariaDbProjectRepository extends InMemoryProjectRepository {}
export class MariaDbRuleProfileRepository extends InMemoryRuleProfileRepository {}
export class MariaDbExportRepository extends InMemoryExportRepository {}

export function createDefaultRuleProfile(): RuleProfile {
  return {
    id: "rule-profile-demo",
    name: "Demo-Regelprofil",
    minAisleWidthMm: 1200,
    minSeatWidthMm: 500,
    minRowClearanceMm: 900,
    minTableDistanceMm: 1200,
    minTableToEscapeRouteDistanceMm: 600,
    maxRowsPerBlock: 12,
    maxSeatsToOneAisle: 10,
    maxSeatsBetweenTwoAisles: 20,
    maxDistanceToExitMm: 35000
  };
}

export function createDemoPlan(): Plan {
  const room: DrawingObject = {
    id: "room-demo",
    role: "room",
    name: "Beispielhalle",
    geometry: { kind: "rect", rect: { x: 0, y: 0, width: 30000, height: 20000 } }
  };
  const objects: DrawingObject[] = [
    { id: "stage-demo", role: "stage", name: "Bühne", geometry: { kind: "rect", rect: { x: 6000, y: 700, width: 18000, height: 3200 } } },
    { id: "foh-demo", role: "foh", name: "FOH / Regie", geometry: { kind: "rect", rect: { x: 12800, y: 14200, width: 4400, height: 2400 } } },
    { id: "zone-demo", role: "no_seat_zone", name: "Technik-Sperrfläche", geometry: { kind: "rect", rect: { x: 23000, y: 7200, width: 3000, height: 2600 } } },
    { id: "route-left", role: "escape_route", name: "Fluchtweg links", geometry: { kind: "rect", rect: { x: 8800, y: 3900, width: 1400, height: 15100 } } },
    { id: "route-right", role: "escape_route", name: "Fluchtweg rechts", geometry: { kind: "rect", rect: { x: 19800, y: 3900, width: 1400, height: 15100 } } },
    { id: "exit-left", role: "exit", name: "Ausgang links", geometry: { kind: "rect", rect: { x: 8800, y: 19000, width: 1400, height: 800 } } },
    { id: "exit-right", role: "exit", name: "Ausgang rechts", geometry: { kind: "rect", rect: { x: 19800, y: 19000, width: 1400, height: 800 } } }
  ];
  const basePlan: Plan = {
    id: "plan-demo",
    projectId: "project-demo",
    name: "Demo-Bestuhlungsplan",
    status: "Entwurf",
    room: room as Plan["room"],
    objects,
    seatingBlocks: [],
    chairs: [],
    tableGroups: [],
    tables: [],
    tableSeats: [],
    ruleProfile: createDefaultRuleProfile(),
    updatedAtIso: new Date(0).toISOString()
  };
  const seating = generateSeating(basePlan);
  const tableLayout = generateTableLayout({ ...basePlan, chairs: seating.chairs, seatingBlocks: seating.seatingBlocks }, { targetTables: 4 });
  const plan: Plan = {
    ...basePlan,
    chairs: seating.chairs,
    seatingBlocks: seating.seatingBlocks,
    tableGroups: tableLayout.tableGroups,
    tables: tableLayout.tables,
    tableSeats: tableLayout.tableSeats
  };
  return { ...plan, validationResult: validatePlan(plan) };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
