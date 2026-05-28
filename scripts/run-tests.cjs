const assert = require("node:assert/strict");

const geometry = require("../packages/geometry/dist/index.js");
const plannerCore = require("../packages/planner-core/dist/index.js");
const repositories = require("../packages/repositories/dist/index.js");
const rules = require("../packages/rules/dist/index.js");

const tests = [];

test("geometry: rectsOverlap erkennt Ueberschneidungen", () => {
  assert.equal(geometry.rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 }), true);
  assert.equal(geometry.rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 150, y: 150, width: 100, height: 100 }), false);
});

test("geometry: rectInsideRect prueft Raumgrenzen", () => {
  assert.equal(geometry.rectInsideRect({ x: 10, y: 10, width: 50, height: 50 }, { x: 0, y: 0, width: 100, height: 100 }), true);
  assert.equal(geometry.rectInsideRect({ x: -10, y: 10, width: 50, height: 50 }, { x: 0, y: 0, width: 100, height: 100 }), false);
});

test("geometry: snapPointToGrid rastet Punkte", () => {
  assert.deepEqual(geometry.snapPointToGrid({ x: 124, y: 376 }, 250), { x: 0, y: 500 });
});

test("geometry: distanceBetweenRects liefert Abstand", () => {
  assert.equal(geometry.distanceBetweenRects({ x: 0, y: 0, width: 100, height: 100 }, { x: 300, y: 0, width: 100, height: 100 }), 200);
});

test("planner-core: generateSeating platziert keine Stuehle in Sperrflaechen", () => {
  const plan = repositories.createDemoPlan();
  const result = plannerCore.generateSeating({ ...plan, tables: [], tableSeats: [], tableGroups: [] }, { targetSeats: 120 });
  const forbidden = plan.objects.filter((object) => ["stage", "foh", "no_seat_zone", "stage_access", "technical_area", "wheelchair_area"].includes(object.role));
  assert.equal(result.chairs.some((chair) => geometry.objectOverlapsForbiddenArea(geometry.chairToRect(chair), forbidden)), false);
});

test("planner-core: generateSeating platziert keine Stuehle in Fluchtwegen", () => {
  const plan = repositories.createDemoPlan();
  const result = plannerCore.generateSeating({ ...plan, tables: [], tableSeats: [], tableGroups: [] }, { targetSeats: 120 });
  const routes = plan.objects.filter((object) => object.role === "escape_route");
  assert.equal(result.chairs.some((chair) => geometry.objectOverlapsForbiddenArea(geometry.chairToRect(chair), routes)), false);
});

test("planner-core: generateTableLayout platziert Tische im Raum", () => {
  const plan = repositories.createDemoPlan();
  const result = plannerCore.generateTableLayout({ ...plan, tables: [], tableSeats: [], tableGroups: [] }, { targetTables: 4 });
  assert.ok(result.tables.length > 0);
  assert.equal(result.tables.every((table) => geometry.isTableInsideRoom(table, plan)), true);
});

test("planner-core: generateTableLayout vermeidet Sperrflaechen grob", () => {
  const plan = repositories.createDemoPlan();
  const result = plannerCore.generateTableLayout({ ...plan, tables: [], tableSeats: [], tableGroups: [] }, { targetTables: 4 });
  const forbidden = plannerCore.getForbiddenAreas(plan);
  assert.equal(result.tables.some((table) => geometry.objectOverlapsForbiddenArea(geometry.tableToRect(table), forbidden)), false);
});

test("rules: erkennt Stuhl in Fluchtweg", () => {
  const plan = repositories.createDemoPlan();
  const route = plan.objects.find((object) => object.role === "escape_route");
  assert.ok(route);
  const routeRect = geometry.objectToRect(route);
  const validation = rules.validatePlan({ ...plan, chairs: [{ id: "test-chair-route", position: { x: routeRect.x + 100, y: routeRect.y + 100 }, widthMm: 500, depthMm: 520, rotationDeg: 0 }] });
  assert.ok(validation.messages.some((message) => message.code === "CHAIR_OVERLAPS_ESCAPE_ROUTE"));
});

test("rules: erkennt Tisch in Sperrflaeche", () => {
  const plan = repositories.createDemoPlan();
  const zone = plan.objects.find((object) => object.role === "no_seat_zone");
  assert.ok(zone);
  const zoneRect = geometry.objectToRect(zone);
  const table = { id: "test-table-zone", type: "round", name: "Testtisch", x: zoneRect.x + 100, y: zoneRect.y + 100, position: { x: zoneRect.x + 100, y: zoneRect.y + 100 }, widthMm: 1800, depthMm: 1800, diameterMm: 1800, rotationDeg: 0, seatCount: 8, seats: 8 };
  const validation = rules.validatePlan({ ...plan, tables: [table], tableSeats: [], tableGroups: [] });
  assert.ok(validation.messages.some((message) => message.code === "TABLE_OVERLAPS_FORBIDDEN_AREA"));
});

test("rules: erkennt zu schmalen Fluchtweg", () => {
  const plan = repositories.createDemoPlan();
  const objects = plan.objects.map((object) =>
    object.role === "escape_route" ? { ...object, geometry: { kind: "rect", rect: { ...geometry.objectToRect(object), height: 900 } } } : object
  );
  const validation = rules.validatePlan({ ...plan, objects });
  assert.ok(validation.messages.some((message) => message.code === "ESCAPE_ROUTE_TOO_NARROW"));
});

for (const item of tests) {
  try {
    item.run();
    console.log(`ok - ${item.name}`);
  } catch (error) {
    console.error(`not ok - ${item.name}`);
    throw error;
  }
}

console.log(`${tests.length} Tests erfolgreich.`);

function test(name, run) {
  tests.push({ name, run });
}
