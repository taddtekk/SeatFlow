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
  | "seating_area"
  | "seating_block"
  | "table"
  | "table_area"
  | "table_group"
  | "generated_aisle"
  | "wheelchair_area"
  | "note";

export interface DrawingObject {
  id: string;
  type?: Geometry["kind"];
  role: ObjectRole;
  name: string;
  geometry: Geometry;
  rotationDeg?: Millimeters;
  locked?: boolean;
  visible?: boolean;
  note?: string;
  safetyDistanceMm?: Millimeters;
  properties?: Record<string, unknown>;
}

export type SeatingGenerateMode = "max" | "target";
export type TableAreaLayoutType = "rounds" | "rectangular" | "banquet" | "parliamentary" | "u_shape" | "block";

export interface SeatingAreaProperties {
  orientationDeg?: Millimeters;
  chairWidthMm?: Millimeters;
  chairDepthMm?: Millimeters;
  rowPitchMm?: Millimeters;
  targetSeatCount?: number;
  maxSeatCount?: number;
  generateMode?: SeatingGenerateMode;
  leftAisleMm?: Millimeters;
  rightAisleMm?: Millimeters;
  centerAisleMm?: Millimeters;
  crossAisleEveryRows?: number;
  blockNamePrefix?: string;
  [key: string]: unknown;
}

export interface TableAreaProperties {
  tableLayoutType?: TableAreaLayoutType;
  tableType?: TableType;
  targetSeats?: number;
  seatsPerTable?: number;
  tableDiameterMm?: Millimeters;
  tableWidthMm?: Millimeters;
  tableDepthMm?: Millimeters;
  tableSpacingMm?: Millimeters;
  chairDistanceMm?: Millimeters;
  rowSpacingMm?: Millimeters;
  orientationDeg?: Millimeters;
  [key: string]: unknown;
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
  rowIndex?: number;
  seatIndex?: number;
  label?: string;
  blockId?: string;
  seatingAreaId?: string;
  tableId?: string;
}

export interface SeatingBlock {
  id: string;
  name: string;
  chairs: Chair[];
  rowCount: number;
  seatCount: number;
  areaId?: string;
  bounds?: Rect;
  generatedAisles?: DrawingObject[];
  properties?: Record<string, unknown>;
}

export type TableType =
  | "round"
  | "rectangle"
  | "banquet"
  | "parliamentary"
  | "block"
  | "u_shape"
  | "custom"
  | "rectangular"
  | "classroom"
  | "boardroom";
export type TableLayoutType = "grid" | "banquet" | "parliamentary" | "block" | "boardroom" | "u_shape" | "mixed" | "custom";

export interface Table {
  id: string;
  type: TableType;
  name: string;
  x?: Millimeters;
  y?: Millimeters;
  position: Point;
  widthMm: Millimeters;
  depthMm: Millimeters;
  diameterMm?: Millimeters;
  rotationDeg: number;
  seatCount?: number;
  seats: number;
  groupId?: string;
  areaId?: string;
  properties?: Record<string, unknown>;
}

export interface TableSeat {
  id: string;
  tableId: string;
  x?: Millimeters;
  y?: Millimeters;
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
  tables?: Table[];
  seats?: TableSeat[];
  properties?: Record<string, unknown>;
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
  objectName?: string;
  objectRole?: ObjectRole;
  code?: string;
  message: string;
  details?: Record<string, unknown>;
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
  version: number;
  room: Room;
  objects: DrawingObject[];
  seatingBlocks: SeatingBlock[];
  chairs: Chair[];
  tableGroups: TableGroup[];
  tables: Table[];
  tableSeats: TableSeat[];
  ruleProfile: RuleProfile;
  validationResults?: ValidationResult;
  validationResult?: ValidationResult;
  metadata: PlanMetadata;
  createdAt?: string;
  updatedAt?: string;
  lastSavedAt?: string;
  updatedAtIso: string;
}

export interface PlanMetadata {
  projectName?: string;
  createdAtIso?: string;
  savedAtIso?: string;
  localDraftAtIso?: string;
  notes?: string;
  [key: string]: unknown;
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
  publicUrl?: string;
  createdAtIso: string;
  createdAt?: string;
}

export type ToolType =
  | "select"
  | "draw_room"
  | "add_stage"
  | "add_foh"
  | "add_no_seat_zone"
  | "add_escape_route"
  | "add_exit"
  | "add_seating_area"
  | "add_seating_block"
  | "add_table"
  | "add_table_area"
  | "add_table_group"
  | "generate_layouts"
  | "generate_table_layout"
  | "delete_object"
  | "recalculate_seating"
  | "export_pdf";

export type SelectedObjectType = "room" | "object" | "table" | "table_group";
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ExportStatus = "idle" | "exporting" | "exported" | "error";

export interface EditorState {
  currentPlan: Plan;
  selectedObjectId?: string;
  selectedObjectType?: SelectedObjectType;
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
  panOffset: Point;
  gridSizeMm: number;
  snapToGrid: boolean;
  isDragging: boolean;
  isResizing: boolean;
  lastCalculationAt?: string;
  lastCalculationIso?: string;
  exportStatus: ExportStatus;
  saveStatus: SaveStatus;
  notice?: string;
  undoStack: EditorHistoryEntry[];
  redoStack: EditorHistoryEntry[];
}

export interface EditorHistoryEntry {
  plan: Plan;
  selectedObjectId?: string;
  selectedObjectType?: SelectedObjectType;
}

export type PlanAction =
  | { type: "SET_PLAN"; plan: Plan }
  | { type: "SELECT_OBJECT"; objectId: string; objectType?: SelectedObjectType }
  | { type: "CLEAR_SELECTION" }
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
  | { type: "SET_PAN"; panOffset: Point }
  | { type: "SET_SNAP_TO_GRID"; snapToGrid: boolean }
  | { type: "SET_GRID_SIZE"; gridSizeMm: number }
  | { type: "SET_SAVE_STATUS"; saveStatus: SaveStatus }
  | { type: "SET_EXPORT_STATUS"; exportStatus: ExportStatus }
  | { type: "SET_LAST_CALCULATION_AT"; lastCalculationAt: string }
  | { type: "SET_INTERACTION_FLAGS"; isDragging?: boolean; isResizing?: boolean }
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
