import { chairOverlapsForbiddenArea, isChairInsideRoom } from "@seatflow/geometry";
import type {
  Chair,
  DrawingObject,
  EscapeRoute,
  Exit,
  FOH,
  NoSeatZone,
  Plan,
  Room,
  RuleProfile,
  SeatingBlock,
  Stage
} from "@seatflow/types";

export interface GenerateSeatingInput {
  room: Room;
  stage?: Stage;
  foh?: FOH;
  noSeatZones?: NoSeatZone[];
  escapeRoutes?: EscapeRoute[];
  ruleProfile: RuleProfile;
  chairWidthMm?: number;
  chairDepthMm?: number;
}

export function generateSeating(input: GenerateSeatingInput): SeatingBlock {
  const chairWidthMm = input.chairWidthMm ?? input.ruleProfile.minSeatWidthMm;
  const chairDepthMm = input.chairDepthMm ?? 520;
  const rowPitchMm = chairDepthMm + input.ruleProfile.minRowClearanceMm;
  const seatPitchMm = chairWidthMm + 80;
  const marginMm = 1000;
  const forbiddenAreas = buildForbiddenAreas(input);
  const chairs: Chair[] = [];

  let rowIndex = 0;
  for (let y = marginMm; y + chairDepthMm <= input.room.heightMm - marginMm; y += rowPitchMm) {
    if (rowIndex >= input.ruleProfile.maxRowsPerBlock) {
      break;
    }

    let seatIndex = 0;
    for (let x = marginMm; x + chairWidthMm <= input.room.widthMm - marginMm; x += seatPitchMm) {
      const chair: Chair = {
        id: `chair-${rowIndex + 1}-${seatIndex + 1}`,
        position: { x, y },
        widthMm: chairWidthMm,
        depthMm: chairDepthMm,
        rotationDeg: 0,
        blockId: "block-demo"
      };

      if (isChairInsideRoom(chair, input.room) && !chairOverlapsForbiddenArea(chair, forbiddenAreas)) {
        chairs.push(chair);
      }

      seatIndex += 1;
    }

    rowIndex += 1;
  }

  return {
    id: "block-demo",
    name: "Automatisch generierter Stuhlblock",
    chairs,
    rowCount: rowIndex,
    seatCount: chairs.length
  };
}

export function createDemoPlan(): Plan {
  const room: Room = {
    id: "room-main",
    name: "Beispielhalle",
    type: "room",
    rect: { x: 0, y: 0, width: 30000, height: 20000 },
    widthMm: 30000,
    heightMm: 20000,
    outline: {
      points: [
        { x: 0, y: 0 },
        { x: 30000, y: 0 },
        { x: 30000, y: 20000 },
        { x: 0, y: 20000 }
      ]
    }
  };

  const stage: Stage = {
    id: "stage-main",
    name: "Bühne",
    type: "stage",
    rect: { x: 6000, y: 700, width: 18000, height: 3200 }
  };

  const foh: FOH = {
    id: "foh-main",
    name: "FOH",
    type: "foh",
    rect: { x: 13000, y: 14200, width: 4000, height: 2500 }
  };

  const escapeRoutes: EscapeRoute[] = [
    {
      id: "route-left",
      name: "Fluchtweg links",
      type: "escapeRoute",
      rect: { x: 8800, y: 3900, width: 1400, height: 15100 },
      widthMm: 1400
    },
    {
      id: "route-right",
      name: "Fluchtweg rechts",
      type: "escapeRoute",
      rect: { x: 19800, y: 3900, width: 1400, height: 15100 },
      widthMm: 1400
    }
  ];

  const exits: Exit[] = [
    {
      id: "exit-left",
      name: "Ausgang links",
      type: "exit",
      rect: { x: 8800, y: 19000, width: 1400, height: 800 },
      capacityHint: 300
    },
    {
      id: "exit-right",
      name: "Ausgang rechts",
      type: "exit",
      rect: { x: 19800, y: 19000, width: 1400, height: 800 },
      capacityHint: 300
    }
  ];

  const ruleProfile: RuleProfile = {
    id: "rules-demo",
    name: "Demo-Regelprofil",
    minAisleWidthMm: 1200,
    minSeatWidthMm: 500,
    minRowClearanceMm: 900,
    maxRowsPerBlock: 12,
    maxSeatsToOneAisle: 10,
    maxSeatsBetweenTwoAisles: 20,
    maxDistanceToExitMm: 35000
  };

  const basePlan: Plan = {
    id: "plan-demo",
    name: "Demo-Bestuhlungsplan",
    room,
    stage,
    foh,
    escapeRoutes,
    noSeatZones: [],
    exits,
    chairs: [],
    seatingBlocks: [],
    ruleProfile
  };

  const seatingBlock = generateSeating({
    room,
    stage,
    foh,
    escapeRoutes,
    noSeatZones: basePlan.noSeatZones,
    ruleProfile
  });

  return {
    ...basePlan,
    chairs: seatingBlock.chairs,
    seatingBlocks: [seatingBlock]
  };
}

function buildForbiddenAreas(input: GenerateSeatingInput): DrawingObject[] {
  const areas: Array<DrawingObject | undefined> = [
    input.stage,
    input.foh,
    ...(input.noSeatZones ?? []),
    ...(input.escapeRoutes ?? [])
  ];

  return areas.filter((area): area is DrawingObject => Boolean(area));
}
