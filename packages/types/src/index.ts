export type Millimeters = number;

export interface Point {
  x: Millimeters;
  y: Millimeters;
}

export interface Rect {
  x: Millimeters;
  y: Millimeters;
  width: Millimeters;
  height: Millimeters;
}

export interface Polygon {
  points: Point[];
}

export type Geometry =
  | { kind: "rect"; rect: Rect; rotationDeg?: number }
  | { kind: "polygon"; polygon: Polygon; rotationDeg?: number };

export type ObjectRole =
  | "room"
  | "stage"
  | "foh"
  | "escape_route"
  | "exit"
  | "no_seat_zone"
  | "stairs"
  | "stage_access"
  | "technical_area"
  | "chair"
  | "seating_block"
  | "table"
  | "table_group"
  | "wheelchair_area"
  | "note";

export interface DrawingObject {
  id: string;
  role: ObjectRole;
  name: string;
  geometry: Geometry;
  note?: string;
  safetyDistanceMm?: Millimeters;
  properties?: Record<string, unknown>;
}

export interface Room extends DrawingObject {
  role: "room";
}

export interface Stage extends DrawingObject {
  role: "stage";
}

export interface FOH extends DrawingObject {
  role: "foh";
}

export interface EscapeRoute extends DrawingObject {
  role: "escape_route";
  minWidthMm?: Millimeters;
}

export interface Exit extends DrawingObject {
  role: "exit";
  capacityHint?: number;
}

export interface NoSeatZone extends DrawingObject {
  role: "no_seat_zone" | "stairs" | "stage_access" | "technical_area" | "wheelchair_area";
}

export interface Chair {
  id: string;
  position: Point;
  widthMm: Millimeters;
  depthMm: Millimeters;
  rotationDeg: number;
  blockId?: string;
  tableId?: string;
}

export interface SeatingBlock {
  id: string;
  name: string;
  chairs: Chair[];
  rowCount: number;
  seatCount: number;
}

export type TableType = "round" | "rectangular" | "banquet" | "classroom" | "boardroom" | "u_shape";
export type TableLayoutType = "grid" | "banquet" | "parliamentary" | "boardroom" | "u_shape" | "mixed";

export interface Table {
  id: string;
  type: TableType;
  name: string;
  position: Point;
  widthMm: Millimeters;
  depthMm: Millimeters;
  diameterMm?: Millimeters;
  rotationDeg: number;
  seats: number;
  groupId?: string;
}

export interface TableSeat {
  id: string;
  tableId: string;
  position: Point;
  widthMm: Millimeters;
  depthMm: Millimeters;
  rotationDeg: number;
}

export interface TableGroup {
  id: string;
  name: string;
  layoutType: TableLayoutType;
  tableIds: string[];
}

export interface RuleProfile {
  id: string;
  name: string;
  minAisleWidthMm: Millimeters;
  minSeatWidthMm: Millimeters;
  minRowClearanceMm: Millimeters;
  minTableDistanceMm: Millimeters;
  minTableToEscapeRouteDistanceMm: Millimeters;
  maxRowsPerBlock: number;
  maxSeatsToOneAisle: number;
  maxSeatsBetweenTwoAisles: number;
  maxDistanceToExitMm: Millimeters;
}

export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationMessage {
  id: string;
  severity: ValidationSeverity;
  objectId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  venueId?: string;
  status: "draft" | "active" | "archived";
  createdAtIso: string;
  updatedAtIso: string;
}

export interface Plan {
  id: string;
  projectId: string;
  name: string;
  status: "Entwurf" | "In Prüfung" | "Freigegeben";
  room: Room;
  objects: DrawingObject[];
  seatingBlocks: SeatingBlock[];
  chairs: Chair[];
  tableGroups: TableGroup[];
  tables: Table[];
  tableSeats: TableSeat[];
  ruleProfile: RuleProfile;
  validationResult?: ValidationResult;
  updatedAtIso: string;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  planSnapshot: Plan;
  createdAtIso: string;
}

export interface ExportResult {
  id: string;
  planId: string;
  fileName: string;
  relativePath: string;
  url: string;
  createdAtIso: string;
}

export type ToolType =
  | "select"
  | "draw_room"
  | "add_stage"
  | "add_foh"
  | "add_no_seat_zone"
  | "add_escape_route"
  | "add_exit"
  | "add_seating_block"
  | "add_table"
  | "add_table_group"
  | "delete_object"
  | "recalculate_seating"
  | "export_pdf";

export interface EditorState {
  currentPlan: Plan;
  selectedObjectId?: string;
  activeTool: ToolType;
  validationResults: ValidationResult;
  showChairs: boolean;
  showTables: boolean;
  showEscapeRoutes: boolean;
  showNoSeatZones: boolean;
  showGrid: boolean;
  showMeasurements: boolean;
  showValidation: boolean;
  dirtyState: boolean;
  zoom: number;
  lastCalculationIso?: string;
  notice?: string;
  undoStack: EditorHistoryEntry[];
  redoStack: EditorHistoryEntry[];
}

export interface EditorHistoryEntry {
  plan: Plan;
  selectedObjectId?: string;
}

export type PlanAction =
  | { type: "SET_PLAN"; plan: Plan }
  | { type: "SELECT_OBJECT"; objectId?: string }
  | { type: "SET_ACTIVE_TOOL"; tool: ToolType }
  | { type: "UPDATE_ROOM"; room: Room }
  | { type: "ADD_OBJECT"; object: DrawingObject }
  | { type: "ADD_TABLE"; table: Table; tableSeats: TableSeat[] }
  | { type: "ADD_TABLE_GROUP"; tableGroup: TableGroup; tables: Table[]; tableSeats: TableSeat[] }
  | { type: "UPDATE_OBJECT"; objectId: string; changes: Partial<DrawingObject> }
  | { type: "UPDATE_TABLE"; tableId: string; changes: Partial<Table> }
  | { type: "DELETE_OBJECT"; objectId: string }
  | { type: "MOVE_OBJECT"; objectId: string; dxMm: number; dyMm: number }
  | { type: "RESIZE_OBJECT"; objectId: string; widthMm?: number; heightMm?: number }
  | { type: "SET_CHAIRS"; chairs: Chair[]; seatingBlocks: SeatingBlock[] }
  | { type: "SET_TABLES"; tables: Table[]; tableGroups: TableGroup[]; tableSeats: TableSeat[] }
  | { type: "SET_VALIDATION_RESULTS"; validationResults: ValidationResult }
  | { type: "SET_DIRTY"; dirty: boolean }
  | { type: "TOGGLE_LAYER"; layer: "showChairs" | "showTables" | "showEscapeRoutes" | "showNoSeatZones" | "showGrid" | "showMeasurements" | "showValidation"; value?: boolean }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "UNDO" }
  | { type: "REDO" };

export interface DatabaseConfig {
  host?: string;
  port?: number;
  name?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface RepositoryConfig {
  storageDriver: "memory" | "mariadb";
  database?: DatabaseConfig;
}

export interface PlanRepository {
  getDemoPlan(): Promise<Plan>;
  findById(id: string): Promise<Plan | null>;
  save(plan: Plan): Promise<Plan>;
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
  save(project: Project): Promise<Project>;
}

export interface RuleProfileRepository {
  getDefault(): Promise<RuleProfile>;
  list(): Promise<RuleProfile[]>;
  save(ruleProfile: RuleProfile): Promise<RuleProfile>;
}

export interface ExportRepository {
  save(result: ExportResult): Promise<ExportResult>;
  findById(id: string): Promise<ExportResult | null>;
  listByPlanId(planId: string): Promise<ExportResult[]>;
}
