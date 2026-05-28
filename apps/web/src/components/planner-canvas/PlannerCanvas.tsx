"use client";

import { chairToRect, objectToRect, snapPointToGrid, tableToRect } from "@seatflow/geometry";
import type { Chair, DrawingObject, Plan, Point, Rect, SelectedObjectType, Table, TableGroup, TableSeat, ToolType, ValidationResult } from "@seatflow/types";
import type { PointerEvent } from "react";
import { useMemo, useRef } from "react";
import { CanvasToolbar } from "./CanvasToolbar";
import { Ruler } from "./Ruler";

type LayerKey = "showChairs" | "showTables" | "showEscapeRoutes" | "showNoSeatZones" | "showGrid" | "showMeasurements" | "showValidation";

interface PlannerCanvasProps {
  activeTool: ToolType;
  gridSizeMm: number;
  layers: Record<LayerKey, boolean>;
  onAddAtPoint: (point: Point) => void;
  onDelete: (id: string) => void;
  onInteractionChange: (flags: { isDragging?: boolean; isResizing?: boolean }) => void;
  onMove: (id: string, dxMm: number, dyMm: number) => void;
  onResize: (id: string, widthMm?: number, heightMm?: number) => void;
  onSelect: (id?: string, objectType?: SelectedObjectType) => void;
  onZoomChange: (zoom: number) => void;
  plan: Plan;
  selectedObjectId?: string | undefined;
  snapToGrid: boolean;
  validationResults: ValidationResult;
  zoom: number;
}

type DragMode = "move" | "resize-x" | "resize-y" | "resize-xy";

interface DragState {
  id: string;
  mode: DragMode;
  lastPoint: Point;
  startPoint: Point;
  startRect: Rect;
}

export function PlannerCanvas({
  activeTool,
  gridSizeMm,
  layers,
  onAddAtPoint,
  onDelete,
  onInteractionChange,
  onMove,
  onResize,
  onSelect,
  onZoomChange,
  plan,
  selectedObjectId,
  snapToGrid,
  validationResults,
  zoom
}: PlannerCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const roomRect = objectToRect(plan.room);
  const viewBox = useMemo(() => {
    const margin = 3000;
    return {
      x: Math.max(0, roomRect.x - margin),
      y: Math.max(0, roomRect.y - margin),
      width: roomRect.width + margin * 2,
      height: roomRect.height + margin * 2
    };
  }, [roomRect.height, roomRect.width, roomRect.x, roomRect.y]);

  function getSvgPoint(event: PointerEvent<SVGElement>): Point {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const transformed = svgPoint.matrixTransform(svg.getScreenCTM()?.inverse());
    const canvasPoint = { x: Math.round(transformed.x), y: Math.round(transformed.y) };
    return snapToGrid && !event.shiftKey ? snapPointToGrid(canvasPoint, gridSizeMm) : canvasPoint;
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    const point = getSvgPoint(event);
    if (isAddTool(activeTool)) {
      onAddAtPoint(point);
      return;
    }
    if (activeTool === "delete_object" && selectedObjectId) {
      onDelete(selectedObjectId);
      return;
    }
    onSelect(undefined);
  }

  function handleEntityPointerDown(event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) {
    event.stopPropagation();
    if (activeTool === "delete_object") {
      onDelete(id);
      return;
    }
    if (activeTool !== "select") {
      return;
    }
    const point = getSvgPoint(event);
    onSelect(id, objectType);
    dragRef.current = { id, mode: "move", lastPoint: point, startPoint: point, startRect: rect };
    onInteractionChange({ isDragging: true, isResizing: false });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHandlePointerDown(event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) {
    event.stopPropagation();
    const point = getSvgPoint(event);
    onSelect(id);
    dragRef.current = { id, mode, lastPoint: point, startPoint: point, startRect: rect };
    onInteractionChange({ isDragging: mode === "move", isResizing: mode !== "move" });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const point = getSvgPoint(event);
    if (drag.mode === "move") {
      const dx = point.x - drag.lastPoint.x;
      const dy = point.y - drag.lastPoint.y;
      if (dx !== 0 || dy !== 0) {
        onMove(drag.id, dx, dy);
        dragRef.current = { ...drag, lastPoint: point };
      }
      return;
    }

    const width = drag.mode === "resize-x" || drag.mode === "resize-xy" ? Math.max(600, drag.startRect.width + point.x - drag.startPoint.x) : undefined;
    const height = drag.mode === "resize-y" || drag.mode === "resize-xy" ? Math.max(600, drag.startRect.height + point.y - drag.startPoint.y) : undefined;
    onResize(drag.id, width, height);
  }

  function stopDragging() {
    dragRef.current = null;
    onInteractionChange({ isDragging: false, isResizing: false });
  }

  return (
    <section className="canvas-area" aria-label="Planfläche">
      <CanvasToolbar onZoomChange={onZoomChange} zoom={zoom} />
      <div className="canvas-frame">
        {layers.showMeasurements ? <Ruler orientation="horizontal" /> : null}
        {layers.showMeasurements ? <Ruler orientation="vertical" /> : null}
        <svg
          className="seatflow-canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerLeave={stopDragging}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          ref={svgRef}
          role="img"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          aria-label="SeatFlow Planfläche"
        >
          <defs>
            <pattern id="sf-grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
              <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="var(--sf-canvas-grid)" strokeWidth="34" />
            </pattern>
            <pattern id="sf-grid-strong" width="5000" height="5000" patternUnits="userSpaceOnUse">
              <path d="M 5000 0 L 0 0 0 5000" fill="none" stroke="var(--sf-canvas-grid-strong)" strokeWidth="48" />
            </pattern>
            <pattern id="sf-hatch" width="360" height="360" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" x2="0" y1="0" y2="360" stroke="var(--sf-no-seat-zone-stroke)" strokeWidth="48" opacity="0.34" />
            </pattern>
            <marker id="sf-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--sf-escape-route-stroke)" />
            </marker>
          </defs>

          <rect className="canvas-bg" height={viewBox.height} width={viewBox.width} x={viewBox.x} y={viewBox.y} />
          {layers.showGrid ? <rect fill="url(#sf-grid)" height={viewBox.height} width={viewBox.width} x={viewBox.x} y={viewBox.y} /> : null}
          {layers.showGrid ? <rect fill="url(#sf-grid-strong)" height={viewBox.height} width={viewBox.width} x={viewBox.x} y={viewBox.y} /> : null}

          <rect className="room-outline" height={roomRect.height} width={roomRect.width} x={roomRect.x} y={roomRect.y} />
          {plan.objects.map((object) => (
            <PlanObject
              hidden={isObjectHidden(object, layers)}
              key={object.id}
              object={object}
              onHandlePointerDown={handleHandlePointerDown}
              onPointerDown={handleEntityPointerDown}
              selected={selectedObjectId === object.id}
            />
          ))}

          {layers.showChairs ? <ChairLayer chairs={plan.chairs} /> : null}
          {layers.showTables ? (
            <TableLayer
              onHandlePointerDown={handleHandlePointerDown}
              onPointerDown={handleEntityPointerDown}
              selectedObjectId={selectedObjectId}
              tableSeats={plan.tableSeats}
              tableGroups={plan.tableGroups}
              tables={plan.tables}
            />
          ) : null}
          {layers.showValidation ? <ValidationMarkers plan={plan} validationResults={validationResults} /> : null}
        </svg>
      </div>
    </section>
  );
}

function PlanObject({
  hidden,
  object,
  onHandlePointerDown,
  onPointerDown,
  selected
}: {
  hidden: boolean;
  object: DrawingObject;
  onHandlePointerDown: (event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) => void;
  selected: boolean;
}) {
  if (hidden || object.role === "room" || object.geometry.kind !== "rect") {
    return null;
  }
  const rect = objectToRect(object);
  const label = object.properties?.label ? String(object.properties.label) : formatLabel(object, rect);
  const className = objectClassName(object.role, selected);
  return (
    <g className={className} onPointerDown={(event) => onPointerDown(event, object.id, rect, "object")}>
      <rect height={rect.height} width={rect.width} x={rect.x} y={rect.y} />
      {object.role === "no_seat_zone" || object.role === "stage_access" ? <rect className="zone-hatch" fill="url(#sf-hatch)" height={rect.height} width={rect.width} x={rect.x} y={rect.y} /> : null}
      {object.role === "escape_route" ? <EscapeRouteLabel object={object} rect={rect} /> : <ObjectLabel label={object.name} rect={rect} subLabel={label !== object.name ? label : undefined} />}
      {selected ? <SelectionHandles id={object.id} onHandlePointerDown={onHandlePointerDown} rect={rect} /> : null}
    </g>
  );
}

function EscapeRouteLabel({ object, rect }: { object: DrawingObject; rect: Rect }) {
  const vertical = object.properties?.direction === "vertical" || rect.height > rect.width;
  const widthLabel = `${(Math.min(rect.width, rect.height) / 1000).toFixed(2).replace(".", ",")} m`;
  if (vertical) {
    return (
      <>
        <line markerEnd="url(#sf-arrow)" x1={rect.x + rect.width / 2} x2={rect.x + rect.width / 2} y1={rect.y + 1200} y2={rect.y + rect.height - 1200} />
        <text transform={`translate(${rect.x + rect.width / 2 + 220} ${rect.y + rect.height / 2}) rotate(-90)`}>{`${object.name.toUpperCase()} ${widthLabel}`}</text>
      </>
    );
  }
  return (
    <>
      <line markerEnd="url(#sf-arrow)" x1={rect.x + 1800} x2={rect.x + rect.width - 1800} y1={rect.y + rect.height / 2} y2={rect.y + rect.height / 2} />
      <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 - 160}>{`${object.name.toUpperCase()} ${widthLabel}`}</text>
    </>
  );
}

function ChairLayer({ chairs }: { chairs: Chair[] }) {
  return (
    <g className="chairs">
      {chairs.map((chair) => {
        const rect = chairToRect(chair);
        return <rect height={rect.height} key={chair.id} rx="70" width={rect.width} x={rect.x} y={rect.y} />;
      })}
    </g>
  );
}

function TableLayer({
  onHandlePointerDown,
  onPointerDown,
  selectedObjectId,
  tableSeats,
  tableGroups,
  tables
}: {
  onHandlePointerDown: (event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) => void;
  selectedObjectId?: string | undefined;
  tableSeats: TableSeat[];
  tableGroups: TableGroup[];
  tables: Table[];
}) {
  const selectedGroup = tableGroups.find((group) => group.id === selectedObjectId);
  const selectedGroupRect = selectedGroup ? getGroupRect(selectedGroup, tables) : null;
  return (
    <g className="tables">
      {tables.map((table) => {
        const rect = tableToRect(table);
        const selected = selectedObjectId === table.id || selectedObjectId === table.groupId;
        const pointerTargetId = selectedObjectId === table.groupId && table.groupId ? table.groupId : table.id;
        const pointerTargetType: SelectedObjectType = pointerTargetId === table.groupId ? "table_group" : "table";
        return (
          <g key={table.id} onPointerDown={(event) => onPointerDown(event, pointerTargetId, rect, pointerTargetType)} className={selected ? "selected-table" : ""}>
            {table.type === "round" ? (
              <circle cx={rect.x + rect.width / 2} cy={rect.y + rect.height / 2} r={rect.width / 2} />
            ) : (
              <rect height={rect.height} rx="70" width={rect.width} x={rect.x} y={rect.y} />
            )}
            <TableSeats seats={tableSeats.filter((seat) => seat.tableId === table.id)} />
            {selected && selectedObjectId === table.id ? <SelectionHandles id={table.id} onHandlePointerDown={onHandlePointerDown} rect={rect} /> : null}
          </g>
        );
      })}
      {selectedGroup && selectedGroupRect ? (
        <g className="table-group-selection" onPointerDown={(event) => onPointerDown(event, selectedGroup.id, selectedGroupRect, "table_group")}>
          <rect height={selectedGroupRect.height} width={selectedGroupRect.width} x={selectedGroupRect.x} y={selectedGroupRect.y} />
          <SelectionHandles id={selectedGroup.id} onHandlePointerDown={onHandlePointerDown} rect={selectedGroupRect} />
        </g>
      ) : null}
    </g>
  );
}

function TableSeats({ seats }: { seats: TableSeat[] }) {
  return (
    <g className="table-seats">
      {seats.map((seat) => (
        <rect height={seat.depthMm} key={seat.id} rx="45" width={seat.widthMm} x={seat.x ?? seat.position.x} y={seat.y ?? seat.position.y} />
      ))}
    </g>
  );
}

function ValidationMarkers({ plan, validationResults }: { plan: Plan; validationResults: ValidationResult }) {
  const entities = [...plan.objects, ...plan.tables.map(tableAsObject)];
  return (
    <g className="validation-markers">
      {validationResults.messages
        .filter((message) => message.severity === "error" && message.objectId)
        .slice(0, 12)
        .map((message) => {
          const entity = entities.find((item) => item.id === message.objectId);
          if (!entity) {
            return null;
          }
          const rect = objectToRect(entity);
          return (
            <g key={message.id}>
              <circle cx={rect.x + rect.width} cy={rect.y + rect.height / 2} r="420" />
              <text x={rect.x + rect.width} y={rect.y + rect.height / 2 + 170}>!</text>
            </g>
          );
        })}
    </g>
  );
}

function SelectionHandles({
  id,
  onHandlePointerDown,
  rect
}: {
  id: string;
  onHandlePointerDown: (event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) => void;
  rect: Rect;
}) {
  const handles: Array<{ mode: DragMode; x: number; y: number }> = [
    { mode: "resize-x", x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    { mode: "resize-y", x: rect.x + rect.width / 2, y: rect.y + rect.height },
    { mode: "resize-xy", x: rect.x + rect.width, y: rect.y + rect.height }
  ];
  return (
    <g className="selection-handles">
      <rect fill="none" height={rect.height} width={rect.width} x={rect.x} y={rect.y} />
      {handles.map((handle) => (
        <rect
          height="360"
          key={handle.mode}
          onPointerDown={(event) => onHandlePointerDown(event, id, rect, handle.mode)}
          width="360"
          x={handle.x - 180}
          y={handle.y - 180}
        />
      ))}
    </g>
  );
}

function ObjectLabel({ label, rect, subLabel }: { label: string; rect: Rect; subLabel?: string | undefined }) {
  return (
    <>
      <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 - (subLabel ? 300 : 0)}>{label.toUpperCase()}</text>
      {subLabel ? <text className="subtext" x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 + 650}>{subLabel}</text> : null}
    </>
  );
}

function objectClassName(role: DrawingObject["role"], selected: boolean): string {
  const classes = ["plan-object", `object-${role}`];
  if (role === "stage") classes.push("stage");
  if (role === "foh") classes.push("foh");
  if (role === "escape_route") classes.push("escape-route");
  if (role === "exit") classes.push("exits");
  if (["no_seat_zone", "stage_access", "stairs", "technical_area", "wheelchair_area"].includes(role)) classes.push("no-seat-zone");
  if (selected) classes.push("selected-object");
  return classes.join(" ");
}

function formatLabel(object: DrawingObject, rect: Rect): string {
  if (object.role === "stage" || object.role === "foh" || object.role === "no_seat_zone") {
    return `${(rect.width / 1000).toFixed(2).replace(".", ",")} m x ${(rect.height / 1000).toFixed(2).replace(".", ",")} m`;
  }
  return object.name;
}

function isObjectHidden(object: DrawingObject, layers: Record<LayerKey, boolean>): boolean {
  if (object.role === "escape_route") return !layers.showEscapeRoutes;
  if (["no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)) return !layers.showNoSeatZones;
  return false;
}

function tableAsObject(table: Table): DrawingObject {
  return {
    id: table.id,
    role: "table",
    name: table.name,
    geometry: { kind: "rect", rect: tableToRect(table) }
  };
}

function isAddTool(tool: ToolType): boolean {
  return ["draw_room", "add_stage", "add_foh", "add_no_seat_zone", "add_escape_route", "add_exit", "add_seating_block", "add_table", "add_table_group"].includes(tool);
}

function getGroupRect(group: TableGroup, tables: Table[]): Rect | null {
  const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
  if (groupTables.length === 0) {
    return null;
  }
  const rects = groupTables.map(tableToRect);
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX - 500, y: minY - 500, width: maxX - minX + 1000, height: maxY - minY + 1000 };
}

