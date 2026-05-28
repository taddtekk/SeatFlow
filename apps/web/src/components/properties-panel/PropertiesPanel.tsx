import { objectToRect, tableToRect } from "@seatflow/geometry";
import type { DrawingObject, ObjectRole, Plan, Rect, Table, TableType } from "@seatflow/types";
import { Eye, EyeOff, Lock, SquareStack, Trash2, Unlock, X } from "../ui/Icons";
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
  "seating_area",
  "table",
  "table_area",
  "table_group",
  "generated_aisle",
  "seating_block",
  "wheelchair_area",
  "note"
];

const tableTypeOptions: TableType[] = ["round", "rectangle", "banquet", "parliamentary", "block", "u_shape", "custom"];
const seatingGenerateModes = ["max", "target"];
const tableAreaLayoutTypes = ["rounds", "rectangular", "banquet", "parliamentary", "u_shape", "block"];

export function PropertiesPanel({
  onDelete,
  onDeleteMany,
  onDuplicate,
  onGenerateAll,
  onGenerateForSelected,
  onLock,
  onSelectNone,
  onSetVisible,
  onUnlock,
  onUpdateObject,
  onUpdateObjectRect,
  onUpdateTable,
  plan,
  selectedObjectId,
  selectedObjectIds
}: {
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onDuplicate: () => void;
  onGenerateAll: () => void;
  onGenerateForSelected: (id: string) => void;
  onLock: (ids: string[]) => void;
  onSelectNone: () => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onUnlock: (ids: string[]) => void;
  onUpdateObject: (id: string, changes: Partial<DrawingObject>) => void;
  onUpdateObjectRect: (id: string, rect: Rect) => void;
  onUpdateTable: (id: string, changes: Partial<Table>) => void;
  plan: Plan;
  selectedObjectId?: string | undefined;
  selectedObjectIds: string[];
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

      {selectedObjectIds.length > 1 ? (
        <MultiSelectionPanel onDeleteMany={onDeleteMany} onDuplicate={onDuplicate} onLock={onLock} onSetVisible={onSetVisible} onUnlock={onUnlock} plan={plan} selectedObjectIds={selectedObjectIds} />
      ) : selectedObject ? (
        <ObjectProperties object={selectedObject} onDelete={onDelete} onGenerateAll={onGenerateAll} onGenerateForSelected={onGenerateForSelected} onLock={onLock} onSetVisible={onSetVisible} onUnlock={onUnlock} onUpdateObject={onUpdateObject} onUpdateRect={onUpdateObjectRect} />
      ) : selectedTable ? (
        <TableProperties onDelete={onDelete} onLock={onLock} onSetVisible={onSetVisible} onUnlock={onUnlock} onUpdateTable={onUpdateTable} table={selectedTable} />
      ) : selectedGroup ? (
        <GroupProperties groupId={selectedGroup.id} onDelete={onDelete} onLock={onLock} onSetVisible={onSetVisible} onUnlock={onUnlock} plan={plan} />
      ) : (
        <p className="empty-panel-copy">Kein Objekt ausgewählt.</p>
      )}
    </Panel>
  );
}

function ObjectProperties({
  object,
  onDelete,
  onGenerateAll,
  onGenerateForSelected,
  onLock,
  onSetVisible,
  onUnlock,
  onUpdateObject,
  onUpdateRect
}: {
  object: DrawingObject;
  onDelete: (id: string) => void;
  onGenerateAll: () => void;
  onGenerateForSelected: (id: string) => void;
  onLock: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onUnlock: (ids: string[]) => void;
  onUpdateObject: (id: string, changes: Partial<DrawingObject>) => void;
  onUpdateRect: (id: string, rect: Rect) => void;
}) {
  const rect = objectToRect(object);
  const heightMm = getNumberProperty(object, "heightMm", 0);
  const minimum = getMinimumSize(object.role);
  return (
    <>
      <SelectedCard id={object.id} title={object.name} />
      <div className="property-grid">
        <PropertyField label="Typ" type="select" value={object.role} options={objectRoleOptions} onChange={(value) => onUpdateObject(object.id, { role: value as ObjectRole })} />
        <PropertyField label="Name" value={object.name} onChange={(value) => onUpdateObject(object.id, { name: value })} />
        <PropertyField label="Position X (mm)" type="number" value={String(Math.round(rect.x))} onChange={(value) => onUpdateRect(object.id, { ...rect, x: toNumber(value, rect.x) })} />
        <PropertyField label="Position Y (mm)" type="number" value={String(Math.round(rect.y))} onChange={(value) => onUpdateRect(object.id, { ...rect, y: toNumber(value, rect.y) })} />
        <PropertyField label="Breite (mm)" type="number" value={String(Math.round(rect.width))} onChange={(value) => onUpdateRect(object.id, { ...rect, width: Math.max(minimum.width, toNumber(value, rect.width)) })} />
        <PropertyField label="Tiefe (mm)" type="number" value={String(Math.round(rect.height))} onChange={(value) => onUpdateRect(object.id, { ...rect, height: Math.max(minimum.height, toNumber(value, rect.height)) })} />
        <PropertyField
          label="Rotation"
          type="select"
          value={`${object.rotationDeg ?? object.geometry.rotationDeg ?? 0}°`}
          options={["0°", "90°", "180°", "270°"]}
          onChange={(value) => onUpdateObject(object.id, { rotationDeg: parseRotation(value), geometry: { ...object.geometry, rotationDeg: parseRotation(value) } })}
        />
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
      {object.role === "seating_area" ? (
        <AreaGeneratorProperties
          object={object}
          onGenerateAll={onGenerateAll}
          onGenerateForSelected={onGenerateForSelected}
          onUpdateObject={onUpdateObject}
          type="seating"
        />
      ) : null}
      {object.role === "table_area" ? (
        <AreaGeneratorProperties
          object={object}
          onGenerateAll={onGenerateAll}
          onGenerateForSelected={onGenerateForSelected}
          onUpdateObject={onUpdateObject}
          type="table"
        />
      ) : null}
      <section className="additional-properties">
        <h3>Zusätzliche Eigenschaften</h3>
        <ObjectStateActions
          disabled={object.role === "room"}
          locked={object.role === "room" || object.locked === true}
          onLock={() => onLock([object.id])}
          onSetVisible={(visible) => onSetVisible([object.id], visible)}
          onUnlock={() => onUnlock([object.id])}
          visible={object.visible !== false}
        />
        <div className="color-property">
          <span>Hintergrundfarbe</span>
          <button aria-label="Hintergrundfarbe" className="color-swatch" type="button" />
        </div>
        <PropertyField label="Notiz" value={object.note ?? ""} onChange={(value) => onUpdateObject(object.id, { note: value })} />
      </section>
      {object.role !== "room" ? (
        <Button className="delete-object-button" disabled={object.locked === true} icon={<Trash2 size={16} />} onClick={() => onDelete(object.id)} variant="danger">
          Objekt löschen
        </Button>
      ) : null}
    </>
  );
}

function TableProperties({
  onDelete,
  onLock,
  onSetVisible,
  onUnlock,
  onUpdateTable,
  table
}: {
  onDelete: (id: string) => void;
  onLock: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onUnlock: (ids: string[]) => void;
  onUpdateTable: (id: string, changes: Partial<Table>) => void;
  table: Table;
}) {
  const rect = tableToRect(table);
  const seatCount = table.seatCount ?? table.seats;
  return (
    <>
      <SelectedCard id={table.id} title={table.name} />
      <div className="property-grid">
        <PropertyField label="Tischtyp" type="select" value={table.type} options={tableTypeOptions} onChange={(value) => onUpdateTable(table.id, { type: value as TableType })} />
        <PropertyField label="Name" value={table.name} onChange={(value) => onUpdateTable(table.id, { name: value })} />
        <PropertyField label="Position X (mm)" type="number" value={String(Math.round(table.x ?? table.position.x))} onChange={(value) => onUpdateTable(table.id, { x: toNumber(value, table.x ?? table.position.x), position: { ...table.position, x: toNumber(value, table.x ?? table.position.x) } })} />
        <PropertyField label="Position Y (mm)" type="number" value={String(Math.round(table.y ?? table.position.y))} onChange={(value) => onUpdateTable(table.id, { y: toNumber(value, table.y ?? table.position.y), position: { ...table.position, y: toNumber(value, table.y ?? table.position.y) } })} />
        <PropertyField label={table.type === "round" ? "Durchmesser (mm)" : "Breite (mm)"} type="number" value={String(Math.round(rect.width))} onChange={(value) => onUpdateTable(table.id, table.type === "round" ? { diameterMm: toNumber(value, rect.width), widthMm: toNumber(value, rect.width), depthMm: toNumber(value, rect.width) } : { widthMm: toNumber(value, rect.width) })} />
        <PropertyField label="Tiefe (mm)" type="number" value={String(Math.round(rect.height))} onChange={(value) => onUpdateTable(table.id, { depthMm: toNumber(value, rect.height) })} />
        <PropertyField label="Sitzplätze" type="number" value={String(seatCount)} onChange={(value) => onUpdateTable(table.id, { seatCount: toNumber(value, seatCount), seats: toNumber(value, seatCount) })} />
        <PropertyField label="Rotation" type="select" value={`${table.rotationDeg}°`} options={["0°", "90°", "180°", "270°"]} onChange={(value) => onUpdateTable(table.id, { rotationDeg: parseRotation(value) })} />
      </div>
      <section className="additional-properties">
        <h3>Abstände</h3>
        <ObjectStateActions
          locked={table.locked === true}
          onLock={() => onLock([table.id])}
          onSetVisible={(visible) => onSetVisible([table.id], visible)}
          onUnlock={() => onUnlock([table.id])}
          visible={table.visible !== false}
        />
        <PropertyField label="Abstand zu Tischen" value="1200 mm" />
        <PropertyField label="Abstand zu Fluchtwegen" value="600 mm" />
      </section>
      <Button className="delete-object-button" disabled={table.locked === true} icon={<Trash2 size={16} />} onClick={() => onDelete(table.id)} variant="danger">
        Objekt löschen
      </Button>
    </>
  );
}

function GroupProperties({
  groupId,
  onDelete,
  onLock,
  onSetVisible,
  onUnlock,
  plan
}: {
  groupId: string;
  onDelete: (id: string) => void;
  onLock: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onUnlock: (ids: string[]) => void;
  plan: Plan;
}) {
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
      <section className="additional-properties">
        <ObjectStateActions
          locked={group.locked === true}
          onLock={() => onLock([group.id])}
          onSetVisible={(visible) => onSetVisible([group.id], visible)}
          onUnlock={() => onUnlock([group.id])}
          visible={group.visible !== false}
        />
      </section>
      <Button className="delete-object-button" disabled={group.locked === true} icon={<Trash2 size={16} />} onClick={() => onDelete(group.id)} variant="danger">
        Objekt löschen
      </Button>
    </>
  );
}

function ObjectStateActions({
  disabled = false,
  locked,
  onLock,
  onSetVisible,
  onUnlock,
  visible
}: {
  disabled?: boolean;
  locked: boolean;
  onLock: () => void;
  onSetVisible: (visible: boolean) => void;
  onUnlock: () => void;
  visible: boolean;
}) {
  return (
    <div className="object-state-actions">
      <Button disabled={disabled} icon={locked ? <Lock size={16} /> : <Unlock size={16} />} onClick={locked ? onUnlock : onLock} variant="secondary">
        {locked ? "Objekt entsperren" : "Objekt sperren"}
      </Button>
      <Button disabled={disabled} icon={visible ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => onSetVisible(!visible)} variant="secondary">
        {visible ? "Objekt ausblenden" : "Objekt anzeigen"}
      </Button>
    </div>
  );
}

function MultiSelectionPanel({
  onDeleteMany,
  onDuplicate,
  onLock,
  onSetVisible,
  onUnlock,
  plan,
  selectedObjectIds
}: {
  onDeleteMany: (ids: string[]) => void;
  onDuplicate: () => void;
  onLock: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onUnlock: (ids: string[]) => void;
  plan: Plan;
  selectedObjectIds: string[];
}) {
  const entities = selectedObjectIds.map((id) => resolveEntity(plan, id)).filter((entity): entity is { id: string; name: string; role: ObjectRole; locked: boolean } => Boolean(entity));
  const unlockedIds = entities.filter((entity) => !entity.locked).map((entity) => entity.id);
  const roleSummary = summarizeRoles(entities.map((entity) => entity.role));
  return (
    <>
      <section className="selected-object-card multi-selected-card">
        <span className="object-swatch">
          <SquareStack size={20} />
        </span>
        <div>
          <p>Mehrere Objekte ausgewählt</p>
          <strong>{entities.length} Objekte</strong>
          <span>{roleSummary}</span>
        </div>
      </section>
      <div className="multi-selection-actions">
        <Button icon={<SquareStack size={16} />} onClick={onDuplicate} variant="secondary">
          Auswahl duplizieren
        </Button>
        <Button icon={<Lock size={16} />} onClick={() => onLock(selectedObjectIds)} variant="secondary">
          Auswahl sperren
        </Button>
        <Button icon={<Unlock size={16} />} onClick={() => onUnlock(selectedObjectIds)} variant="secondary">
          Auswahl entsperren
        </Button>
        <Button icon={<EyeOff size={16} />} onClick={() => onSetVisible(selectedObjectIds, false)} variant="secondary">
          Auswahl ausblenden
        </Button>
        <Button icon={<Eye size={16} />} onClick={() => onSetVisible(selectedObjectIds, true)} variant="secondary">
          Auswahl anzeigen
        </Button>
        <Button disabled={unlockedIds.length === 0} icon={<Trash2 size={16} />} onClick={() => onDeleteMany(unlockedIds)} variant="danger">
          Auswahl löschen
        </Button>
      </div>
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

function AreaGeneratorProperties({
  object,
  onGenerateAll,
  onGenerateForSelected,
  onUpdateObject,
  type
}: {
  object: DrawingObject;
  onGenerateAll: () => void;
  onGenerateForSelected: (id: string) => void;
  onUpdateObject: (id: string, changes: Partial<DrawingObject>) => void;
  type: "seating" | "table";
}) {
  const props = object.properties ?? {};
  function updateProperty(key: string, value: string | number) {
    onUpdateObject(object.id, { properties: { ...props, [key]: value } });
  }

  if (type === "seating") {
    return (
      <section className="additional-properties generator-panel">
        <h3>Generator</h3>
        <div className="property-grid">
          <PropertyField label="Modus" type="select" value={String(props.generateMode ?? "target")} options={seatingGenerateModes} onChange={(value) => updateProperty("generateMode", value)} />
          <PropertyField label="Ziel-Sitzplätze" type="number" value={String(props.targetSeatCount ?? 120)} onChange={(value) => updateProperty("targetSeatCount", toNumber(value, 120))} />
          <PropertyField label="Stuhlbreite" type="number" value={String(props.chairWidthMm ?? 500)} onChange={(value) => updateProperty("chairWidthMm", toNumber(value, 500))} />
          <PropertyField label="Stuhltiefe" type="number" value={String(props.chairDepthMm ?? 520)} onChange={(value) => updateProperty("chairDepthMm", toNumber(value, 520))} />
          <PropertyField label="Reihenabstand" type="number" value={String(props.rowPitchMm ?? 1420)} onChange={(value) => updateProperty("rowPitchMm", toNumber(value, 1420))} />
          <PropertyField label="Mittelgang" type="number" value={String(props.centerAisleMm ?? 0)} onChange={(value) => updateProperty("centerAisleMm", toNumber(value, 0))} />
          <PropertyField label="Querweg alle Reihen" type="number" value={String(props.crossAisleEveryRows ?? 0)} onChange={(value) => updateProperty("crossAisleEveryRows", toNumber(value, 0))} />
          <PropertyField label="Block-Prefix" value={String(props.blockNamePrefix ?? "A")} onChange={(value) => updateProperty("blockNamePrefix", value)} />
        </div>
        <Button icon={<SquareStack size={16} />} onClick={() => onGenerateForSelected(object.id)} variant="primary">
          Für ausgewählten Bereich generieren
        </Button>
        <Button icon={<SquareStack size={16} />} onClick={onGenerateAll} variant="secondary">
          Alle Bereiche neu generieren
        </Button>
      </section>
    );
  }

  return (
    <section className="additional-properties generator-panel">
      <h3>Generator</h3>
      <div className="property-grid">
        <PropertyField label="Modus" type="select" value={String(props.tableLayoutType ?? "rounds")} options={tableAreaLayoutTypes} onChange={(value) => updateProperty("tableLayoutType", value)} />
        <PropertyField label="Tischtyp" type="select" value={String(props.tableType ?? "round")} options={tableTypeOptions} onChange={(value) => updateProperty("tableType", value)} />
        <PropertyField label="Ziel-Sitzplätze" type="number" value={String(props.targetSeats ?? 64)} onChange={(value) => updateProperty("targetSeats", toNumber(value, 64))} />
        <PropertyField label="Sitze pro Tisch" type="number" value={String(props.seatsPerTable ?? 8)} onChange={(value) => updateProperty("seatsPerTable", toNumber(value, 8))} />
        <PropertyField label="Durchmesser" type="number" value={String(props.tableDiameterMm ?? 1800)} onChange={(value) => updateProperty("tableDiameterMm", toNumber(value, 1800))} />
        <PropertyField label="Tischbreite" type="number" value={String(props.tableWidthMm ?? 2200)} onChange={(value) => updateProperty("tableWidthMm", toNumber(value, 2200))} />
        <PropertyField label="Tischtiefe" type="number" value={String(props.tableDepthMm ?? 900)} onChange={(value) => updateProperty("tableDepthMm", toNumber(value, 900))} />
        <PropertyField label="Tischabstand" type="number" value={String(props.tableSpacingMm ?? 1200)} onChange={(value) => updateProperty("tableSpacingMm", toNumber(value, 1200))} />
      </div>
      <Button icon={<SquareStack size={16} />} onClick={() => onGenerateForSelected(object.id)} variant="primary">
        Für ausgewählten Bereich generieren
      </Button>
      <Button icon={<SquareStack size={16} />} onClick={onGenerateAll} variant="secondary">
        Alle Bereiche neu generieren
      </Button>
    </section>
  );
}

function resolveEntity(plan: Plan, id: string): { id: string; name: string; role: ObjectRole; locked: boolean } | null {
  if (plan.room.id === id) {
    return { id, name: plan.room.name, role: "room", locked: true };
  }
  const object = plan.objects.find((item) => item.id === id);
  if (object) {
    return { id, name: object.name, role: object.role, locked: object.locked === true };
  }
  const table = plan.tables.find((item) => item.id === id);
  if (table) {
    return { id, name: table.name, role: "table", locked: table.locked === true };
  }
  const group = plan.tableGroups.find((item) => item.id === id);
  if (group) {
    return { id, name: group.name, role: "table_group", locked: group.locked === true };
  }
  return null;
}

function summarizeRoles(roles: ObjectRole[]): string {
  const counts = roles.reduce<Record<string, number>>((accumulator, role) => {
    const label = labelForRole(role);
    accumulator[label] = (accumulator[label] ?? 0) + 1;
    return accumulator;
  }, {});
  return Object.entries(counts)
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");
}

function getMinimumSize(role: ObjectRole): { width: number; height: number } {
  if (role === "stage" || role === "foh") return { width: 1000, height: 1000 };
  if (role === "escape_route" || role === "no_seat_zone" || role === "stairs" || role === "stage_access" || role === "technical_area" || role === "wheelchair_area") return { width: 500, height: 500 };
  if (role === "exit") return { width: 300, height: 300 };
  if (role === "seating_area" || role === "table_area") return { width: 1000, height: 1000 };
  if (role === "generated_aisle") return { width: 500, height: 500 };
  if (role === "seating_block") return { width: 1000, height: 1000 };
  return { width: 100, height: 100 };
}

function parseRotation(value: string): number {
  return toNumber(value.replace("°", ""), 0);
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
