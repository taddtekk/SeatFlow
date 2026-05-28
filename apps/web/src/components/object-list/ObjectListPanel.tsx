import { objectToRect, tableToRect } from "@seatflow/geometry";
import type { DrawingObject, ObjectRole, Plan, Rect, Table, TableGroup } from "@seatflow/types";
import { Armchair, Ban, Building2, DoorOpen, Eye, EyeOff, Grid3X3, Layers, Lock, Route, Square, SquareStack, Table2, Unlock } from "../ui/Icons";
import { IconButton } from "../ui/Button";
import { Panel } from "../ui/Panel";

interface ObjectListPanelProps {
  onCenterObject: (objectId: string) => void;
  onSelectObject: (objectId: string, additive?: boolean) => void;
  onSetVisible: (objectIds: string[], visible: boolean) => void;
  onToggleLock: (objectIds: string[], locked: boolean) => void;
  plan: Plan;
  selectedObjectIds: string[];
}

interface ObjectListEntry {
  id: string;
  group: string;
  name: string;
  role: ObjectRole;
  locked: boolean;
  visible: boolean;
  rect: Rect | null;
}

const groupOrder = ["Raum", "Sicherheit", "Bestuhlung", "Tische", "Technik"];

export function ObjectListPanel({ onCenterObject, onSelectObject, onSetVisible, onToggleLock, plan, selectedObjectIds }: ObjectListPanelProps) {
  const entries = createObjectListEntries(plan);
  const grouped = groupOrder
    .map((group) => ({ group, entries: entries.filter((entry) => entry.group === group) }))
    .filter((section) => section.entries.length > 0);

  return (
    <Panel className="object-list-panel">
      <div className="panel-heading object-list-heading">
        <h2>Objekte</h2>
        <span>{entries.length}</span>
      </div>
      <div className="object-list">
        {grouped.map((section) => (
          <section className="object-list-section" key={section.group}>
            <h3>{section.group}</h3>
            {section.entries.map((entry) => (
              <button
                className={`object-list-item ${selectedObjectIds.includes(entry.id) ? "is-selected" : ""} ${entry.visible ? "" : "is-hidden"}`}
                key={entry.id}
                onClick={(event) => onSelectObject(entry.id, event.shiftKey)}
                onDoubleClick={() => onCenterObject(entry.id)}
                type="button"
              >
                <span className={`object-list-swatch role-${entry.role}`}>{iconForRole(entry.role)}</span>
                <span className="object-list-copy">
                  <strong>{entry.name}</strong>
                  <small>{labelForRole(entry.role)}</small>
                </span>
                <span className="object-list-actions" onClick={(event) => event.stopPropagation()}>
                  <IconButton
                    aria-label={entry.visible ? "Objekt ausblenden" : "Objekt anzeigen"}
                    disabled={entry.role === "room"}
                    icon={entry.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    onClick={() => onSetVisible([entry.id], !entry.visible)}
                  />
                  <IconButton
                    aria-label={entry.locked ? "Objekt entsperren" : "Objekt sperren"}
                    disabled={entry.role === "room"}
                    icon={entry.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    onClick={() => onToggleLock([entry.id], !entry.locked)}
                  />
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </Panel>
  );
}

function createObjectListEntries(plan: Plan): ObjectListEntry[] {
  const roomEntry: ObjectListEntry = {
    id: plan.room.id,
    group: "Raum",
    name: plan.room.name,
    role: "room",
    locked: true,
    visible: true,
    rect: objectToRect(plan.room)
  };
  return [
    roomEntry,
    ...plan.objects.map((object) => objectEntry(object)),
    ...plan.tables.map((table) => tableEntry(table)),
    ...plan.tableGroups.map((group) => groupEntry(group, plan.tables))
  ].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.name.localeCompare(b.name, "de"));
}

function objectEntry(object: DrawingObject): ObjectListEntry {
  return {
    id: object.id,
    group: groupForRole(object.role),
    name: object.name,
    role: object.role,
    locked: object.locked === true,
    visible: object.visible !== false,
    rect: object.geometry.kind === "rect" ? objectToRect(object) : null
  };
}

function tableEntry(table: Table): ObjectListEntry {
  return {
    id: table.id,
    group: "Tische",
    name: table.name,
    role: "table",
    locked: table.locked === true,
    visible: table.visible !== false,
    rect: tableToRect(table)
  };
}

function groupEntry(group: TableGroup, tables: Table[]): ObjectListEntry {
  const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
  const rect = groupTables.length > 0 ? getGroupRect(groupTables) : null;
  return {
    id: group.id,
    group: "Tische",
    name: group.name,
    role: "table_group",
    locked: group.locked === true,
    visible: group.visible !== false,
    rect
  };
}

function getGroupRect(tables: Table[]): Rect {
  const rects = tables.map(tableToRect);
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function groupForRole(role: ObjectRole): string {
  if (role === "room") return "Raum";
  if (role === "escape_route" || role === "exit" || role === "no_seat_zone" || role === "stage_access" || role === "stairs" || role === "wheelchair_area") return "Sicherheit";
  if (role === "seating_area" || role === "seating_block" || role === "chair" || role === "generated_aisle") return "Bestuhlung";
  if (role === "table" || role === "table_area" || role === "table_group") return "Tische";
  return "Technik";
}

function iconForRole(role: ObjectRole) {
  if (role === "room") return <Square size={15} />;
  if (role === "stage") return <Building2 size={15} />;
  if (role === "escape_route") return <Route size={15} />;
  if (role === "exit") return <DoorOpen size={15} />;
  if (role === "no_seat_zone" || role === "stage_access" || role === "stairs") return <Ban size={15} />;
  if (role === "seating_area" || role === "seating_block" || role === "generated_aisle") return <Armchair size={15} />;
  if (role === "table" || role === "table_area") return <Table2 size={15} />;
  if (role === "table_group") return <Layers size={15} />;
  if (role === "foh" || role === "technical_area") return <Grid3X3 size={15} />;
  return <SquareStack size={15} />;
}

function labelForRole(role: ObjectRole): string {
  const labels: Record<ObjectRole, string> = {
    chair: "Stuhl",
    escape_route: "Fluchtweg",
    exit: "Ausgang",
    foh: "FOH",
    generated_aisle: "Interner Gang",
    no_seat_zone: "Sperrfläche",
    note: "Notiz",
    room: "Raum",
    seating_area: "Bestuhlungsbereich",
    seating_block: "Stuhlblock",
    stage: "Bühne",
    stage_access: "Bühnenaufgang",
    stairs: "Treppe",
    table: "Tisch",
    table_area: "Tischbereich",
    table_group: "Tischgruppe",
    technical_area: "Technik",
    wheelchair_area: "Rollstuhlbereich"
  };
  return labels[role];
}
