import type { CSSProperties } from "react";
import type { Rect } from "@seatflow/types";

const markStepMm = 5000;

export function Ruler({
  lengthPx,
  offsetPx,
  orientation,
  pxPerMm,
  viewBox
}: {
  lengthPx: number;
  offsetPx: number;
  orientation: "horizontal" | "vertical";
  pxPerMm: number;
  viewBox: Rect;
}) {
  const marks = createMarks(viewBox, orientation, pxPerMm);
  const style: CSSProperties =
    orientation === "horizontal"
      ? { height: offsetPx, left: offsetPx, top: 0, width: lengthPx }
      : { height: lengthPx, left: 0, top: offsetPx, width: offsetPx };

  return (
    <div className={`ruler ruler-${orientation}`} style={style} aria-hidden="true">
      {marks.map((mark) => (
        <span key={mark.value} style={{ [orientation === "horizontal" ? "left" : "top"]: `${mark.positionPx}px` }}>
          {mark.label}
        </span>
      ))}
    </div>
  );
}

function createMarks(viewBox: Rect, orientation: "horizontal" | "vertical", pxPerMm: number): Array<{ label: string; positionPx: number; value: number }> {
  const start = orientation === "horizontal" ? viewBox.x : viewBox.y;
  const length = orientation === "horizontal" ? viewBox.width : viewBox.height;
  const firstMark = Math.ceil(start / markStepMm) * markStepMm;
  const marks: Array<{ label: string; positionPx: number; value: number }> = [];
  for (let value = firstMark; value <= start + length; value += markStepMm) {
    marks.push({
      label: `${Math.round(value / 1000)}m`,
      positionPx: (value - start) * pxPerMm,
      value
    });
  }
  return marks;
}
