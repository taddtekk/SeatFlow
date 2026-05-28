"use client";

import {
  chairToRect,
  getBoundingRect,
  getRectCenter,
  mmToCanvasPx,
  objectToRect,
  rectsOverlap,
  snapPointToGrid,
  tableToRect
} from "@seatflow/geometry";
import type {
  Chair,
  DrawingObject,
  EditorTransientHint,
  Plan,
  Point,
  Rect,
  SelectedObjectType,
  Table,
  TableGroup,
  TableSeat,
  ToolType,
  ValidationResult
} from "@seatflow/types";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasToolbar } from "./CanvasToolbar";
import { Ruler } from "./Ruler";

type LayerKey = "showChairs" | "showTables" | "showEscapeRoutes" | "showNoSeatZones" | "showGrid" | "showMeasurements" | "showValidation";
type DragMode = "move" | "resize-x" | "resize-y" | "resize-xy";

interface PlannerCanvasProps {
  activeTool: ToolType;
  centerTarget?: { id: string; nonce: number } | null;
  fitRequest: number;
  gridSizeMm: number;
  layers: Record<LayerKey, boolean>;
  onAddAtPoint: (point: Point) => void;
  onDelete: (id: string) => void;
  onInteractionChange: (flags: { isDragging?: boolean; isResizing?: boolean; isPanning?: boolean }) => void;
  onMove: (ids: string[], dxMm: number, dyMm: number) => void;
  onResize: (id: string, widthMm?: number, heightMm?: number) => void;
  onSelect: (id?: string, objectType?: SelectedObjectType, additive?: boolean) => void;
  onSetSelectedObjects: (ids: string[]) => void;
  onSetSelectionBox: (selectionBox: Rect | null) => void;
  onSetTransientHint: (hint?: EditorTransientHint) => void;
  onZoomChange: (zoom: number) => void;
  plan: Plan;
  recentlyHighlightedObjectId?: string | undefined;
  selectedObjectId?: string | undefined;
  selectedObjectIds: string[];
  selectionBox?: Rect | null | undefined;
  snapToGrid: boolean;
  transientHint?: EditorTransientHint | undefined;
  validationResults: ValidationResult;
  zoom: number;
}

interface DragState {
  id: string;
  ids: string[];
  mode: DragMode;
  lastPoint: Point;
  startPoint: Point;
  startRect: Rect;
}

interface SelectionState {
  additive: boolean;
  currentRect?: Rect;
  moved: boolean;
  startPoint: Point;
}

interface PanState {
  clientX: number;
  clientY: number;
  scrollLeft: number;
  scrollTop: number;
}

const BASE_PX_PER_MM = 1040 / 40000;
const VIEWBOX_MARGIN_MM = 1500;
const RULER_SIZE_PX = 30;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

export function PlannerCanvas({
  activeTool,
  centerTarget,
  fitRequest,
  gridSizeMm,
  layers,
  onAddAtPoint,
  onDelete,
  onInteractionChange,
  onMove,
  onResize,
  onSelect,
  onSetSelectedObjects,
  onSetSelectionBox,
  onSetTransientHint,
  onZoomChange,
  plan,
  recentlyHighlightedObjectId,
  selectedObjectId,
  selectedObjectIds,
  selectionBox,
  snapToGrid,
  transientHint,
  validationResults,
  zoom
}: PlannerCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const selectionRef = useRef<SelectionState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const roomRect = objectToRect(plan.room);
  const viewBox = useMemo(() => {
    return {
      x: Math.max(0, roomRect.x - VIEWBOX_MARGIN_MM),
      y: Math.max(0, roomRect.y - VIEWBOX_MARGIN_MM),
      width: roomRect.width + VIEWBOX_MARGIN_MM * 2,
      height: roomRect.height + VIEWBOX_MARGIN_MM * 2
    };
  }, [roomRect.height, roomRect.width, roomRect.x, roomRect.y]);
  const pxPerMm = BASE_PX_PER_MM * zoom;
  const canvasPixelWidth = Math.round(mmToCanvasPx(viewBox.width, pxPerMm));
  const canvasPixelHeight = Math.round(mmToCanvasPx(viewBox.height, pxPerMm));
  const rulerSize = layers.showMeasurements ? RULER_SIZE_PX : 0;
  const stagePixelWidth = canvasPixelWidth + rulerSize;
  const stagePixelHeight = canvasPixelHeight + rulerSize;
  const stageStyle: CSSProperties = { height: stagePixelHeight, width: stagePixelWidth };
  const svgStyle: CSSProperties = {
    height: canvasPixelHeight,
    left: rulerSize,
    top: rulerSize,
    width: canvasPixelWidth
  };
  const selectedRects = selectedObjectIds.map((id) => getEntityRect(plan, id)).filter((rect): rect is Rect => Boolean(rect));
  const multiSelectionRect = selectedObjectIds.length > 1 ? getBoundingRect(selectedRects) : null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space" && !isEditableTarget(event.target)) {
        setSpacePressed(true);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (fitRequest > 0) {
      fitToScreen();
    }
  }, [fitRequest]);

  useEffect(() => {
    if (!centerTarget) {
      return;
    }
    centerObjectInViewport(centerTarget.id);
  }, [centerTarget?.id, centerTarget?.nonce, pxPerMm, rulerSize, viewBox.x, viewBox.y]);

  function getSvgPoint(event: PointerEvent<SVGElement>, shouldSnap = true): Point {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return { x: 0, y: 0 };
    }
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const transformed = svgPoint.matrixTransform(matrix.inverse());
    const canvasPoint = { x: Math.round(transformed.x), y: Math.round(transformed.y) };
    return snapToGrid && shouldSnap && !event.shiftKey ? snapPointToGrid(canvasPoint, gridSizeMm) : canvasPoint;
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (isPanGesture(event)) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const point = getSvgPoint(event, true);
    if (isAddTool(activeTool)) {
      onAddAtPoint(point);
      return;
    }
    if (activeTool === "delete_object" && selectedObjectId) {
      onDelete(selectedObjectId);
      return;
    }
    if (activeTool !== "select") {
      return;
    }
    selectionRef.current = { additive: event.shiftKey, moved: false, startPoint: getSvgPoint(event, false) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleEntityPointerDown(event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) {
    if (isPanGesture(event)) {
      return;
    }
    event.stopPropagation();
    if (activeTool === "delete_object") {
      onDelete(id);
      return;
    }
    if (activeTool !== "select" || event.button !== 0) {
      return;
    }
    const additive = event.shiftKey;
    if (additive) {
      onSelect(id, objectType, true);
      return;
    }
    const alreadySelected = selectedObjectIds.includes(id);
    const dragIds = alreadySelected ? selectedObjectIds : [id];
    onSelect(id, objectType, false);
    if (isEntityLocked(plan, id)) {
      return;
    }
    const point = getSvgPoint(event, true);
    dragRef.current = { id, ids: dragIds, mode: "move", lastPoint: point, startPoint: point, startRect: rect };
    onInteractionChange({ isDragging: true, isResizing: false });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHandlePointerDown(event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) {
    event.stopPropagation();
    if (isEntityLocked(plan, id)) {
      onSelect(id);
      return;
    }
    const point = getSvgPoint(event, true);
    onSelect(id);
    dragRef.current = { id, ids: [id], mode, lastPoint: point, startPoint: point, startRect: rect };
    onInteractionChange({ isDragging: mode === "move", isResizing: mode !== "move" });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag) {
      const point = getSvgPoint(event, true);
      if (drag.mode === "move") {
        const dx = point.x - drag.lastPoint.x;
        const dy = point.y - drag.lastPoint.y;
        if (dx !== 0 || dy !== 0) {
          onMove(drag.ids, dx, dy);
          dragRef.current = { ...drag, lastPoint: point };
        }
        onSetTransientHint({
          text: `X: ${Math.round(drag.startRect.x + point.x - drag.startPoint.x)} mm · Y: ${Math.round(drag.startRect.y + point.y - drag.startPoint.y)} mm`,
          ...getHintPosition(event)
        });
        return;
      }

      const width = drag.mode === "resize-x" || drag.mode === "resize-xy" ? Math.max(300, drag.startRect.width + point.x - drag.startPoint.x) : undefined;
      const height = drag.mode === "resize-y" || drag.mode === "resize-xy" ? Math.max(300, drag.startRect.height + point.y - drag.startPoint.y) : undefined;
      onResize(drag.id, width, height);
      onSetTransientHint({
        text: `B: ${Math.round(width ?? drag.startRect.width)} mm · T: ${Math.round(height ?? drag.startRect.height)} mm`,
        ...getHintPosition(event)
      });
      return;
    }

    const selection = selectionRef.current;
    if (!selection) {
      return;
    }
    const point = getSvgPoint(event, false);
    const rect = normalizeRect(selection.startPoint, point);
    selectionRef.current = { ...selection, currentRect: rect, moved: selection.moved || rect.width > 120 || rect.height > 120 };
    onSetSelectionBox(rect);
  }

  function stopCanvasInteractions() {
    const selection = selectionRef.current;
    if (selection) {
      const box = selection.currentRect;
      if (box && selection.moved) {
        const selectedIds = collectEntityIdsInSelection(plan, layers, box);
        onSetSelectedObjects(selection.additive ? [...selectedObjectIds, ...selectedIds] : selectedIds);
      } else if (!selection.additive) {
        onSelect(undefined);
      }
    }
    dragRef.current = null;
    selectionRef.current = null;
    onSetSelectionBox(null);
    onSetTransientHint(undefined);
    onInteractionChange({ isDragging: false, isResizing: false });
  }

  function handleViewportPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isPanGesture(event)) {
      return;
    }
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    panRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    };
    onInteractionChange({ isPanning: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleViewportPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const viewport = viewportRef.current;
    if (!pan || !viewport) {
      return;
    }
    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX);
    viewport.scrollTop = pan.scrollTop - (event.clientY - pan.clientY);
  }

  function stopPanning() {
    if (!panRef.current) {
      return;
    }
    panRef.current = null;
    onInteractionChange({ isPanning: false });
  }

  function fitToScreen() {
    const viewport = viewportRef.current;
    if (!viewport) {
      onZoomChange(1);
      return;
    }
    const style = window.getComputedStyle(viewport);
    const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const availableWidth = Math.max(1, viewport.clientWidth - horizontalPadding - rulerSize);
    const availableHeight = Math.max(1, viewport.clientHeight - verticalPadding - rulerSize);
    const widthZoom = availableWidth / mmToCanvasPx(viewBox.width, BASE_PX_PER_MM);
    const heightZoom = availableHeight / mmToCanvasPx(viewBox.height, BASE_PX_PER_MM);
    onZoomChange(clampZoom(Math.min(widthZoom, heightZoom)));
  }

  function centerObjectInViewport(objectId: string) {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const rect = getEntityRect(plan, objectId);
    if (!viewport || !stage || !rect) {
      return;
    }
    const center = getRectCenter(rect);
    window.requestAnimationFrame(() => {
      const viewportBounds = viewport.getBoundingClientRect();
      const stageBounds = stage.getBoundingClientRect();
      const targetX = stageBounds.left - viewportBounds.left + viewport.scrollLeft + rulerSize + (center.x - viewBox.x) * pxPerMm;
      const targetY = stageBounds.top - viewportBounds.top + viewport.scrollTop + rulerSize + (center.y - viewBox.y) * pxPerMm;
      viewport.scrollTo({
        left: Math.max(0, targetX - viewport.clientWidth / 2),
        top: Math.max(0, targetY - viewport.clientHeight / 2),
        behavior: "smooth"
      });
    });
  }

  function handleViewportWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    const viewport = viewportRef.current;
    const nextZoom = clampZoom(zoom + (event.deltaY > 0 ? -0.1 : 0.1));
    if (!viewport || nextZoom === zoom) {
      onZoomChange(nextZoom);
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const focusX = viewport.scrollLeft + event.clientX - bounds.left;
    const focusY = viewport.scrollTop + event.clientY - bounds.top;
    const scale = nextZoom / zoom;
    onZoomChange(nextZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = focusX * scale - (event.clientX - bounds.left);
      viewport.scrollTop = focusY * scale - (event.clientY - bounds.top);
    });
  }

  function isPanGesture(event: PointerEvent<Element>): boolean {
    return event.button === 1 || (spacePressed && event.button === 0);
  }

  return (
    <section className="canvas-area" aria-label="Planfläche">
      <CanvasToolbar onFitToScreen={fitToScreen} onZoomChange={(nextZoom) => onZoomChange(clampZoom(nextZoom))} zoom={zoom} />
      <div
        className={`canvas-viewport ${spacePressed || panRef.current ? "is-panning" : ""}`}
        onPointerDown={handleViewportPointerDown}
        onPointerLeave={stopPanning}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={stopPanning}
        onWheel={handleViewportWheel}
        ref={viewportRef}
      >
        <div className="canvas-scroll-content">
          <div className="canvas-stage" ref={stageRef} style={stageStyle}>
            {layers.showMeasurements ? <div className="ruler-corner" aria-hidden="true" /> : null}
            {layers.showMeasurements ? <Ruler lengthPx={canvasPixelWidth} offsetPx={rulerSize} orientation="horizontal" pxPerMm={pxPerMm} viewBox={viewBox} /> : null}
            {layers.showMeasurements ? <Ruler lengthPx={canvasPixelHeight} offsetPx={rulerSize} orientation="vertical" pxPerMm={pxPerMm} viewBox={viewBox} /> : null}
            <svg
              aria-label="SeatFlow Planfläche"
              className="seatflow-canvas"
              height={canvasPixelHeight}
              onPointerDown={handleCanvasPointerDown}
              onPointerLeave={stopCanvasInteractions}
              onPointerMove={handlePointerMove}
              onPointerUp={stopCanvasInteractions}
              preserveAspectRatio="none"
              ref={svgRef}
              role="img"
              style={svgStyle}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              width={canvasPixelWidth}
            >
              <defs>
                <pattern id="sf-grid" width={gridSizeMm} height={gridSizeMm} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSizeMm} 0 L 0 0 0 ${gridSizeMm}`} fill="none" stroke="var(--sf-canvas-grid)" strokeWidth="34" />
                </pattern>
                <pattern id="sf-grid-strong" width={gridSizeMm * 5} height={gridSizeMm * 5} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSizeMm * 5} 0 L 0 0 0 ${gridSizeMm * 5}`} fill="none" stroke="var(--sf-canvas-grid-strong)" strokeWidth="48" />
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
                  highlighted={recentlyHighlightedObjectId === object.id}
                  hidden={isObjectHidden(object, layers)}
                  key={object.id}
                  object={object}
                  onHandlePointerDown={handleHandlePointerDown}
                  onPointerDown={handleEntityPointerDown}
                  selected={selectedObjectIds.includes(object.id)}
                  showHandles={selectedObjectIds.length === 1 && selectedObjectIds[0] === object.id && object.locked !== true}
                />
              ))}

              {layers.showChairs ? <ChairLayer chairs={plan.chairs} zoom={zoom} /> : null}
              {layers.showChairs ? <BlockLabels plan={plan} zoom={zoom} /> : null}
              {layers.showTables ? (
                <TableLayer
                  highlightedObjectId={recentlyHighlightedObjectId}
                  onHandlePointerDown={handleHandlePointerDown}
                  onPointerDown={handleEntityPointerDown}
                  selectedObjectIds={selectedObjectIds}
                  tableSeats={plan.tableSeats}
                  tableGroups={plan.tableGroups}
                  tables={plan.tables}
                />
              ) : null}
              {multiSelectionRect ? <MultiSelectionBox rect={multiSelectionRect} /> : null}
              {selectionBox ? <SelectionBox rect={selectionBox} /> : null}
              {layers.showValidation ? <ValidationMarkers plan={plan} validationResults={validationResults} /> : null}
            </svg>
          </div>
        </div>
      </div>
      {transientHint ? <DragHint hint={transientHint} /> : null}
    </section>
  );
}

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number.isFinite(zoom) ? zoom : 1));
}

function PlanObject({
  highlighted,
  hidden,
  object,
  onHandlePointerDown,
  onPointerDown,
  selected,
  showHandles
}: {
  highlighted: boolean;
  hidden: boolean;
  object: DrawingObject;
  onHandlePointerDown: (event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) => void;
  selected: boolean;
  showHandles: boolean;
}) {
  if (hidden || object.role === "room" || object.geometry.kind !== "rect") {
    return null;
  }
  const rect = objectToRect(object);
  const label = object.properties?.label ? String(object.properties.label) : formatLabel(object, rect);
  const className = objectClassName(object, { highlighted, selected });
  return (
    <g className={className} onPointerDown={(event) => onPointerDown(event, object.id, rect, "object")}>
      <rect height={rect.height} width={rect.width} x={rect.x} y={rect.y} />
      {object.locked ? <LockBadge rect={rect} /> : null}
      {object.role === "no_seat_zone" || object.role === "stage_access" ? <rect className="zone-hatch" fill="url(#sf-hatch)" height={rect.height} width={rect.width} x={rect.x} y={rect.y} /> : null}
      {object.role === "escape_route" ? <EscapeRouteLabel object={object} rect={rect} /> : <ObjectLabel label={object.name} rect={rect} subLabel={label !== object.name ? label : undefined} />}
      {showHandles ? <SelectionHandles id={object.id} onHandlePointerDown={onHandlePointerDown} rect={rect} /> : null}
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

function ChairLayer({ chairs, zoom }: { chairs: Chair[]; zoom: number }) {
  return (
    <g className="chairs">
      {chairs.map((chair) => {
        const rect = chairToRect(chair);
        return (
          <g key={chair.id}>
            <rect height={rect.height} rx="70" width={rect.width} x={rect.x} y={rect.y} />
            {zoom >= 1.55 && chair.label ? <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2}>{chair.label}</text> : null}
          </g>
        );
      })}
    </g>
  );
}

function BlockLabels({ plan, zoom }: { plan: Plan; zoom: number }) {
  if (zoom < 0.85) {
    return null;
  }
  return (
    <g className="block-labels">
      {plan.seatingBlocks.map((block) => {
        const rect = block.bounds ?? getChairsRect(block.chairs);
        return rect ? (
          <text key={block.id} x={rect.x + rect.width / 2} y={rect.y - 420}>
            {block.name} · {block.seatCount}
          </text>
        ) : null;
      })}
    </g>
  );
}

function TableLayer({
  highlightedObjectId,
  onHandlePointerDown,
  onPointerDown,
  selectedObjectIds,
  tableSeats,
  tableGroups,
  tables
}: {
  highlightedObjectId?: string | undefined;
  onHandlePointerDown: (event: PointerEvent<SVGRectElement>, id: string, rect: Rect, mode: DragMode) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, id: string, rect: Rect, objectType: SelectedObjectType) => void;
  selectedObjectIds: string[];
  tableSeats: TableSeat[];
  tableGroups: TableGroup[];
  tables: Table[];
}) {
  const hiddenGroups = new Set(tableGroups.filter((group) => group.visible === false).flatMap((group) => group.tableIds));
  const selectedGroups = tableGroups.filter((group) => selectedObjectIds.includes(group.id));
  return (
    <g className="tables">
      {tables
        .filter((table) => table.visible !== false && !hiddenGroups.has(table.id))
        .map((table) => {
          const rect = tableToRect(table);
          const groupSelected = Boolean(table.groupId && selectedObjectIds.includes(table.groupId));
          const selected = selectedObjectIds.includes(table.id) || groupSelected;
          const pointerTargetId = groupSelected && table.groupId ? table.groupId : table.id;
          const pointerTargetType: SelectedObjectType = groupSelected ? "table_group" : "table";
          const tableClass = ["table-object", selected ? "selected-table" : "", table.locked ? "is-locked" : "", highlightedObjectId === table.id ? "is-highlighted" : ""].filter(Boolean).join(" ");
          return (
            <g key={table.id} onPointerDown={(event) => onPointerDown(event, pointerTargetId, rect, pointerTargetType)} className={tableClass}>
              {table.type === "round" ? (
                <circle cx={rect.x + rect.width / 2} cy={rect.y + rect.height / 2} r={rect.width / 2} />
              ) : (
                <rect height={rect.height} rx="70" width={rect.width} x={rect.x} y={rect.y} />
              )}
              {table.locked ? <LockBadge rect={rect} /> : null}
              <TableSeats seats={tableSeats.filter((seat) => seat.tableId === table.id)} />
              {selectedObjectIds.length === 1 && selectedObjectIds[0] === table.id && table.locked !== true ? <SelectionHandles id={table.id} onHandlePointerDown={onHandlePointerDown} rect={rect} /> : null}
            </g>
          );
        })}
      {selectedGroups.map((group) => {
        const groupRect = getGroupRect(group, tables);
        if (!groupRect) {
          return null;
        }
        const showHandles = selectedObjectIds.length === 1 && group.locked !== true;
        return (
          <g className={`table-group-selection ${group.locked ? "is-locked" : ""} ${highlightedObjectId === group.id ? "is-highlighted" : ""}`} key={group.id} onPointerDown={(event) => onPointerDown(event, group.id, groupRect, "table_group")}>
            <rect height={groupRect.height} width={groupRect.width} x={groupRect.x} y={groupRect.y} />
            {group.locked ? <LockBadge rect={groupRect} /> : null}
            {showHandles ? <SelectionHandles id={group.id} onHandlePointerDown={onHandlePointerDown} rect={groupRect} /> : null}
          </g>
        );
      })}
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

function SelectionBox({ rect }: { rect: Rect }) {
  return <rect className="selection-box" height={rect.height} width={rect.width} x={rect.x} y={rect.y} />;
}

function MultiSelectionBox({ rect }: { rect: Rect }) {
  return <rect className="multi-selection-box" height={rect.height} width={rect.width} x={rect.x} y={rect.y} />;
}

function DragHint({ hint }: { hint: EditorTransientHint }) {
  return (
    <div className="drag-hint" style={{ left: hint.x, top: hint.y }}>
      {hint.text}
    </div>
  );
}

function LockBadge({ rect }: { rect: Rect }) {
  return (
    <g className="lock-badge" aria-hidden="true">
      <circle cx={rect.x + rect.width - 360} cy={rect.y + 360} r="230" />
      <text x={rect.x + rect.width - 360} y={rect.y + 450}>L</text>
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

function objectClassName(object: DrawingObject, options: { highlighted: boolean; selected: boolean }): string {
  const classes = ["plan-object", `object-${object.role}`];
  if (object.role === "stage") classes.push("stage");
  if (object.role === "foh") classes.push("foh");
  if (object.role === "escape_route") classes.push("escape-route");
  if (object.role === "exit") classes.push("exits");
  if (object.role === "seating_area") classes.push("seating-area");
  if (object.role === "table_area") classes.push("table-area");
  if (object.role === "generated_aisle") classes.push("generated-aisle");
  if (["no_seat_zone", "stage_access", "stairs", "technical_area", "wheelchair_area"].includes(object.role)) classes.push("no-seat-zone");
  if (object.locked) classes.push("is-locked");
  if (options.selected) classes.push("selected-object");
  if (options.highlighted) classes.push("is-highlighted");
  return classes.join(" ");
}

function formatLabel(object: DrawingObject, rect: Rect): string {
  if (object.role === "stage" || object.role === "foh" || object.role === "no_seat_zone" || object.role === "seating_area" || object.role === "table_area") {
    return `${(rect.width / 1000).toFixed(2).replace(".", ",")} m x ${(rect.height / 1000).toFixed(2).replace(".", ",")} m`;
  }
  return object.name;
}

function isObjectHidden(object: DrawingObject, layers: Record<LayerKey, boolean>): boolean {
  if (object.visible === false) return true;
  if (object.role === "escape_route") return !layers.showEscapeRoutes;
  if (object.role === "generated_aisle") return !layers.showEscapeRoutes;
  if (object.role === "seating_area") return !layers.showChairs;
  if (object.role === "table_area") return !layers.showTables;
  if (["no_seat_zone", "stairs", "stage_access", "technical_area", "wheelchair_area"].includes(object.role)) return !layers.showNoSeatZones;
  return false;
}

function getChairsRect(chairs: Chair[]): Rect | null {
  if (chairs.length === 0) {
    return null;
  }
  return getBoundingRect(chairs.map(chairToRect));
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
  return ["draw_room", "add_stage", "add_foh", "add_no_seat_zone", "add_escape_route", "add_exit", "add_seating_area", "add_seating_block", "add_table", "add_table_area", "add_table_group"].includes(tool);
}

function getGroupRect(group: TableGroup, tables: Table[]): Rect | null {
  const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
  if (groupTables.length === 0) {
    return null;
  }
  const rects = groupTables.map(tableToRect);
  const bounding = getBoundingRect(rects);
  return bounding ? { x: bounding.x - 500, y: bounding.y - 500, width: bounding.width + 1000, height: bounding.height + 1000 } : null;
}

function getEntityRect(plan: Plan, id: string): Rect | null {
  if (plan.room.id === id) {
    return objectToRect(plan.room);
  }
  const object = plan.objects.find((item) => item.id === id);
  if (object?.geometry.kind === "rect") {
    return objectToRect(object);
  }
  const table = plan.tables.find((item) => item.id === id);
  if (table) {
    return tableToRect(table);
  }
  const group = plan.tableGroups.find((item) => item.id === id);
  return group ? getGroupRect(group, plan.tables) : null;
}

function collectEntityIdsInSelection(plan: Plan, layers: Record<LayerKey, boolean>, selection: Rect): string[] {
  const objectIds = plan.objects
    .filter((object) => object.role !== "room" && !isObjectHidden(object, layers) && object.geometry.kind === "rect" && rectsOverlap(objectToRect(object), selection))
    .map((object) => object.id);
  const tableIds = layers.showTables
    ? plan.tables
        .filter((table) => table.visible !== false && rectsOverlap(tableToRect(table), selection))
        .map((table) => table.id)
    : [];
  return [...objectIds, ...tableIds];
}

function normalizeRect(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function isEntityLocked(plan: Plan, id: string): boolean {
  if (plan.room.id === id) {
    return true;
  }
  const object = plan.objects.find((item) => item.id === id);
  if (object) {
    return object.locked === true;
  }
  const table = plan.tables.find((item) => item.id === id);
  if (table) {
    return table.locked === true;
  }
  const group = plan.tableGroups.find((item) => item.id === id);
  return group?.locked === true;
}

function getHintPosition(event: PointerEvent<SVGElement>): { x: number; y: number } {
  return { x: event.clientX + 14, y: event.clientY + 14 };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}
