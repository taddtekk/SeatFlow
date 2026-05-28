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

export type DrawingObjectType =
  | "room"
  | "stage"
  | "foh"
  | "escapeRoute"
  | "noSeatZone"
  | "exit"
  | "custom";

export interface DrawingObject {
  id: string;
  name: string;
  type: DrawingObjectType;
  rect: Rect;
  polygon?: Polygon;
}

export interface Room extends DrawingObject {
  type: "room";
  widthMm: Millimeters;
  heightMm: Millimeters;
  outline: Polygon;
}

export interface EscapeRoute extends DrawingObject {
  type: "escapeRoute";
  widthMm: Millimeters;
}

export interface NoSeatZone extends DrawingObject {
  type: "noSeatZone";
  reason?: string;
}

export interface Stage extends DrawingObject {
  type: "stage";
}

export interface FOH extends DrawingObject {
  type: "foh";
}

export interface Exit extends DrawingObject {
  type: "exit";
  capacityHint?: number;
}

export interface Chair {
  id: string;
  position: Point;
  widthMm: Millimeters;
  depthMm: Millimeters;
  rotationDeg: number;
  blockId?: string;
}

export interface SeatingBlock {
  id: string;
  name: string;
  chairs: Chair[];
  rowCount: number;
  seatCount: number;
}

export interface RuleProfile {
  id: string;
  name: string;
  minAisleWidthMm: Millimeters;
  minSeatWidthMm: Millimeters;
  minRowClearanceMm: Millimeters;
  maxRowsPerBlock: number;
  maxSeatsToOneAisle: number;
  maxSeatsBetweenTwoAisles: number;
  maxDistanceToExitMm: Millimeters;
}

export type ValidationSeverity = "warning" | "error";

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

export interface Plan {
  id: string;
  name: string;
  room: Room;
  stage?: Stage;
  foh?: FOH;
  escapeRoutes: EscapeRoute[];
  noSeatZones: NoSeatZone[];
  exits: Exit[];
  chairs: Chair[];
  seatingBlocks: SeatingBlock[];
  ruleProfile: RuleProfile;
  validationResult?: ValidationResult;
}
