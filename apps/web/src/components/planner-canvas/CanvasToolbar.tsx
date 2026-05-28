import { Maximize2, Minus, Plus, Search } from "../ui/Icons";
import { IconButton } from "../ui/Button";

export function CanvasToolbar() {
  return (
    <div className="canvas-toolbar" aria-label="Canvas-Ansicht">
      <div className="segmented-control" role="group" aria-label="Ansicht umschalten">
        <button className="is-active" type="button">2D</button>
        <button type="button">3D</button>
      </div>
      <IconButton aria-label="Zoom vergrößern" icon={<Search size={16} />} />
      <IconButton aria-label="Zoom verkleinern" icon={<Minus size={16} />} />
      <IconButton aria-label="Auf Ansicht einpassen" icon={<Maximize2 size={16} />} />
      <div className="zoom-pill">
        <Minus size={13} />
        <span>100 %</span>
        <Plus size={13} />
      </div>
    </div>
  );
}
