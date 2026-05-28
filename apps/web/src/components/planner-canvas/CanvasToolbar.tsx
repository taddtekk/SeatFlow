import { Maximize2, Minus, Plus, Search } from "../ui/Icons";
import { IconButton } from "../ui/Button";

export function CanvasToolbar({ onZoomChange, zoom }: { onZoomChange: (zoom: number) => void; zoom: number }) {
  return (
    <div className="canvas-toolbar" aria-label="Canvas-Ansicht">
      <div className="segmented-control" role="group" aria-label="Ansicht umschalten">
        <button className="is-active" type="button">2D</button>
        <button type="button">3D</button>
      </div>
      <IconButton aria-label="Zoom vergrößern" icon={<Search size={16} />} onClick={() => onZoomChange(zoom + 0.1)} />
      <IconButton aria-label="Zoom verkleinern" icon={<Minus size={16} />} onClick={() => onZoomChange(zoom - 0.1)} />
      <IconButton aria-label="Auf Ansicht einpassen" icon={<Maximize2 size={16} />} onClick={() => onZoomChange(1)} />
      <div className="zoom-pill">
        <button type="button" onClick={() => onZoomChange(zoom - 0.1)} aria-label="Zoom verkleinern"><Minus size={13} /></button>
        <span>{Math.round(zoom * 100)} %</span>
        <button type="button" onClick={() => onZoomChange(zoom + 0.1)} aria-label="Zoom vergrößern"><Plus size={13} /></button>
      </div>
    </div>
  );
}
