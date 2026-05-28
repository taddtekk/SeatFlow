import { objectToRect, tableToRect } from "@seatflow/geometry";
import type { DrawingObject, ObjectRole, Plan, Rect, Table, TableType } from "@seatflow/types";
import { SquareStack, Trash2, X } from "../ui/Icons";
import { Button, IconButton } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { PropertyField } from "./PropertyField";

const objectRoleOptions: ObjectRole[] = [
  "room",
  "stage",
  "foh",
  "escape_route",
  "exit",
  "no_seat_zone",
  "stairs",
  "stage_access",
  "technical_area",
  "seating_block",
  "wheelchair_area",
  "note"
];

const tableTypeOptions: TableType[] = ["round", "rectangular", "banquet", "classroom", "boardroom", "u_shape"];

export function PropertiesPanel({
  onDelete,
  onSelectNone,
  onUpdateObject,
  onUpdateObjectRect,
  onUpdateTable,
  plan,
  selectedObjectId
}: {
  onDelete: (id: string) => void;
  onSelectNone: () => void;
  onUpdateObject: (id: string, changes: Partial<DrawingObject>) => void;
  onUpdateObjectRect: (id: string, rect: Rect) => void;
  onUpdateTable: (id: string, changes: Partial<Table>) => void;
  plan: Plan;
  selectedObjectId?: string | undefined;
}) {
  const selectedObject = plan.room.id === selectedObjectId ? plan.room : plan.objects.find((object) => object.id === selectedObjectId);
  const selectedTable = plan.tables.find((table) => table.id === selectedObjectId);
  const selectedGroup = plan.tableGroups.find((group) => group.id === selectedObjectId);

  return (
    <Panel className="properties-panel">
      <div className="panel-heading">
        <h2>Eigenschaften</h2>
        <IconButton aria-label="Eigenschaften schließen" icon={<X size={17} />} onClick={onSelectNone} />
      </div>

      {selectedObject ? (
        <ObjectProperties object={selectedObject} onDelete={onDelete} onUpdateObject={onUpdateObject} onUpdateRect={onUpdateObjectRect} />
      ) : selectedTable ? (
        <TableProperties onDelete={onDelete} onUpdateTable={onUpdateTable} table={selectedTable} />
      ) : selectedGroup ? (
        <GroupProperties onDelete={onDelete} plan={plan} groupId={selectedGroup.id} />
      ) : (
        <p className="empty-panel-copy">Kein Objekt ausgewählt.</p>
      )}
    </Panel>
  );
}

function ObjectProperties({
  object,
  onDelete,
  onUpdateObject,
  onUpdateRect
}: {
  object: DrawingObject;
  onDelete: (id: string) => void;
  onUpdateObject: (id: string, changes: Partial<DrawingObject>) => void;
  onUpdateRect: (id: string, rect: Rect) => void;
}) {
  const rect = objectToRect(object);
  const heightMm = getNumberProperty(object, "heightMm", 0);
  return (
    <>
      <SelectedCard id={object.id} title={object.name} />
      <div className="property-grid">
        <PropertyField label="Typ" type="select" value={object.role} options={objectRoleOptions} onChange={(value) => onUpdateObject(object.id, { role: value as ObjectRole })} />
        <PropertyField label="Name" value={object.name} onChange={(value) => onUpdateObject(object.id, { name: value })} />
        <PropertyField label="Position X (mm)" type="number" value={String(Math.round(rect.x))} onChange={(value) => onUpdateRect(object.id, { ...rect, x: toNumber(value, rect.x) })} />
        <PropertyField label="Position Y (mm)" type="number" value={String(Math.round(rect.y))} onChange={(value) => onUpdateRect(object.id, { ...rect, y: toNumber(value, rect.y) })} />
        <PropertyField label="Breite (mm)" type="number" value={String(Math.round(rect.width))} onChange={(value) => onUpdateRect(object.id, { ...rect, width: Math.max(100, toNumber(value, rect.width)) })} />
        <PropertyField label="Tiefe (mm)" type="number" value={String(Math.round(rect.height))} onChange={(value) => onUpdateRect(object.id, { ...rect, height: Math.max(100, toNumber(value, rect.height)) })} />
        <PropertyField label="Rotation" type="select" value={`${object.geometry.rotationDeg ?? 0}°`} options={["0°", "90°", "180°", "270°"]} />
        <PropertyField
          label="Höhe (mm)"
          type="number"
          value={String(heightMm)}
          onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, heightMm: toNumber(value, heightMm) } })}
        />
      </div>
      {object.role === "escape_route" ? (
        <div className="route-extra">
          <strong>Fluchtwegbreite</strong>
          <span>{Math.min(rect.width, rect.height)} mm</span>
        </div>
      ) : null}
      <section className="additional-properties">
        <h3>Zusätzliche Eigenschaften</h3>
        <div className="color-property">
          <span>Hintergrundfarbe</span>
          <button aria-label="Hintergrundfarbe" className="color-swatch" type="button" />
        </div>
        <PropertyField label="Notiz" value={object.note ?? ""} onChange={(value) => onUpdateObject(object.id, { note: value })} />
      </section>
      <Button className="delete-object-button" icon={<Trash2 size={16} />} onClick={() => onDelete(object.id)} variant="danger">
        Objekt löschen
      </Button>
    </>
  );
}

function TableProperties({
  onDelete,
  onUpdateTable,
  table
}: {
  onDelete: (id: string) => void;
  onUpdateTable: (id: string, changes: Partial<Table>) => void;
  table: Table;
}) {
  const rect = tableToRect(table);
  return (
    <>
      <SelectedCard id={table.id} title={table.name} />
      <div className="property-grid">
        <PropertyField label="Tischtyp" type="select" value={table.type} options={tableTypeOptions} onChange={(value) => onUpdateTable(table.id, { type: value as TableType })} />
        <PropertyField label="Name" value={table.name} onChange={(value) => onUpdateTable(table.id, { name: value })} />
        <PropertyField label="Position X (mm)" type="number" value={String(Math.round(table.position.x))} onChange={(value) => onUpdateTable(table.id, { position: { ...table.position, x: toNumber(value, table.position.x) } })} />
        <PropertyField label="Position Y (mm)" type="number" value={String(Math.round(table.position.y))} onChange={(value) => onUpdateTable(table.id, { position: { ...table.position, y: toNumber(value, table.position.y) } })} />
        <PropertyField label={table.type === "round" ? "Durchmesser (mm)" : "Breite (mm)"} type="number" value={String(Math.round(rect.width))} onChange={(value) => onUpdateTable(table.id, table.type === "round" ? { diameterMm: toNumber(value, rect.width), widthMm: toNumber(value, rect.width), depthMm: toNumber(value, rect.width) } : { widthMm: toNumber(value, rect.width) })} />
        <PropertyField label="Tiefe (mm)" type="number" value={String(Math.round(rect.height))} onChange={(value) => onUpdateTable(table.id, { depthMm: toNumber(value, rect.height) })} />
        <PropertyField label="Sitzplätze" type="number" value={String(table.seats)} onChange={(value) => onUpdateTable(table.id, { seats: toNumber(value, table.seats) })} />
        <PropertyField label="Rotation" type="select" value={`${table.rotationDeg}°`} options={["0°", "90°", "180°", "270°"]} />
      </div>
      <section className="additional-properties">
        <h3>Abstände</h3>
        <PropertyField label="Abstand zu Tischen" value="1200 mm" />
        <PropertyField label="Abstand zu Fluchtwegen" value="600 mm" />
      </section>
      <Button className="delete-object-button" icon={<Trash2 size={16} />} onClick={() => onDelete(table.id)} variant="danger">
        Objekt löschen
      </Button>
    </>
  );
}

function GroupProperties({ groupId, onDelete, plan }: { groupId: string; onDelete: (id: string) => void; plan: Plan }) {
  const group = plan.tableGroups.find((item) => item.id === groupId);
  if (!group) {
    return null;
  }
  return (
    <>
      <SelectedCard id={group.id} title={group.name} />
      <div className="property-grid">
        <PropertyField label="Typ" value="Tischgruppe" />
        <PropertyField label="Tische" value={String(group.tableIds.length)} />
        <PropertyField label="Layout" value={group.layoutType} />
      </div>
      <Button className="delete-object-button" icon={<Trash2 size={16} />} onClick={() => onDelete(group.id)} variant="danger">
        Objekt löschen
      </Button>
    </>
  );
}

function SelectedCard({ id, title }: { id: string; title: string }) {
  return (
    <section className="selected-object-card">
      <span className="object-swatch">
        <SquareStack size={20} />
      </span>
      <div>
        <p>Ausgewähltes Objekt</p>
        <strong>{title}</strong>
        <span>ID: {id}</span>
      </div>
    </section>
  );
}

function getNumberProperty(object: DrawingObject, key: string, fallback: number): number {
  const value = object.properties?.[key];
  return typeof value === "number" ? value : fallback;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
