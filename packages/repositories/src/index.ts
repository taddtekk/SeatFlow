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
        name: "Sommerkonzert 2026",
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
    name: "Standard 2026",
    minAisleWidthMm: 2000,
    minSeatWidthMm: 500,
    minRowClearanceMm: 900,
    minTableDistanceMm: 1200,
    minTableToEscapeRouteDistanceMm: 600,
    maxRowsPerBlock: 14,
    maxSeatsToOneAisle: 10,
    maxSeatsBetweenTwoAisles: 20,
    maxDistanceToExitMm: 35000
  };
}

export function createDemoPlan(): Plan {
  const room: DrawingObject = {
    id: "room-demo",
    role: "room",
    name: "Haupthalle",
    geometry: { kind: "rect", rect: { x: 3000, y: 1000, width: 36000, height: 31600 } }
  };
  const objects: DrawingObject[] = [
    {
      id: "stage-demo",
      role: "stage",
      name: "Bühne",
      note: "Hauptbühne, erhöht",
      properties: { heightMm: 1200, label: "16,00 m x 6,00 m" },
      geometry: { kind: "rect", rect: { x: 12000, y: 1000, width: 16000, height: 6000 } }
    },
    { id: "stage-access-left", role: "stage_access", name: "Bühnenaufgang links", geometry: { kind: "rect", rect: { x: 7200, y: 3200, width: 3800, height: 5200 } } },
    { id: "stage-access-right", role: "stage_access", name: "Bühnenaufgang rechts", geometry: { kind: "rect", rect: { x: 31000, y: 3200, width: 3800, height: 5200 } } },
    { id: "foh-demo", role: "foh", name: "FOH", geometry: { kind: "rect", rect: { x: 17600, y: 27800, width: 6000, height: 3000 } } },
    { id: "zone-left", role: "no_seat_zone", name: "Sperrfläche links", geometry: { kind: "rect", rect: { x: 4200, y: 26300, width: 6400, height: 5200 } } },
    { id: "zone-right", role: "no_seat_zone", name: "Sperrfläche rechts", geometry: { kind: "rect", rect: { x: 31000, y: 26600, width: 6400, height: 4900 } } },
    { id: "route-north", role: "escape_route", name: "Fluchtweg Nord", properties: { direction: "horizontal" }, geometry: { kind: "rect", rect: { x: 4000, y: 10300, width: 34000, height: 2000 } } },
    { id: "route-middle", role: "escape_route", name: "Fluchtweg Mitte", properties: { direction: "vertical" }, geometry: { kind: "rect", rect: { x: 19300, y: 10200, width: 2500, height: 16500 } } },
    { id: "route-south", role: "escape_route", name: "Fluchtweg Süd", properties: { direction: "horizontal" }, geometry: { kind: "rect", rect: { x: 4000, y: 22500, width: 34000, height: 1800 } } },
    { id: "exit-west-north", role: "exit", name: "Ausgang West Nord", geometry: { kind: "rect", rect: { x: 2400, y: 10600, width: 850, height: 1100 } } },
    { id: "exit-east-north", role: "exit", name: "Ausgang Ost Nord", geometry: { kind: "rect", rect: { x: 38800, y: 10600, width: 850, height: 1100 } } },
    { id: "exit-west-south", role: "exit", name: "Ausgang West Süd", geometry: { kind: "rect", rect: { x: 2400, y: 22400, width: 850, height: 1100 } } },
    { id: "exit-east-south", role: "exit", name: "Ausgang Ost Süd", geometry: { kind: "rect", rect: { x: 38800, y: 22400, width: 850, height: 1100 } } },
    { id: "exit-south-left", role: "exit", name: "Ausgang Süd links", geometry: { kind: "rect", rect: { x: 11200, y: 31600, width: 1100, height: 850 } } },
    { id: "exit-south-right", role: "exit", name: "Ausgang Süd rechts", geometry: { kind: "rect", rect: { x: 28800, y: 31600, width: 1100, height: 850 } } }
  ];
  const basePlan: Plan = {
    id: "plan-demo",
    projectId: "project-demo",
    name: "Hauptbühne - Variante 3",
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
  const tableLayout = generateTableLayout({ ...basePlan, chairs: seating.chairs, seatingBlocks: seating.seatingBlocks }, { targetTables: 12 });
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
