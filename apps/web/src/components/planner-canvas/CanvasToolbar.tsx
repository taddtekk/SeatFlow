import { Maximize2, Minus, Plus } from "../ui/Icons";
import { IconButton } from "../ui/Button";

const zoomLevels = [0.5, 0.75, 1, 1.2, 1.5, 2];
const minZoomLevel = 0.5;
const maxZoomLevel = 2;

export function CanvasToolbar({ onFitToScreen, onZoomChange, zoom }: { onFitToScreen: () => void; onZoomChange: (zoom: number) => void; zoom: number }) {
  function previousZoom() {
    const next = [...zoomLevels].reverse().find((level) => level < zoom - 0.01) ?? minZoomLevel;
    onZoomChange(next);
  }

  function nextZoom() {
    const next = zoomLevels.find((level) => level > zoom + 0.01) ?? maxZoomLevel;
    onZoomChange(next);
  }

  return (
    <div className="canvas-toolbar" aria-label="Canvas-Ansicht">
      <div className="segmented-control" role="group" aria-label="Ansicht umschalten">
        <button className="is-active" type="button">2D</button>
        <button type="button">3D</button>
      </div>
      <IconButton aria-label="Zoom verkleinern" icon={<Minus size={16} />} onClick={previousZoom} />
      <button className="zoom-reset-button" onClick={() => onZoomChange(1)} type="button">100 %</button>
      <IconButton aria-label="Zoom vergrößern" icon={<Plus size={16} />} onClick={nextZoom} />
      <IconButton aria-label="Auf Ansicht einpassen" icon={<Maximize2 size={16} />} onClick={onFitToScreen} />
      <div className="zoom-pill">
        <button type="button" onClick={previousZoom} aria-label="Zoom verkleinern"><Minus size={13} /></button>
        <span>{Math.round(zoom * 100)} %</span>
        <button type="button" onClick={nextZoom} aria-label="Zoom vergrößern"><Plus size={13} /></button>
      </div>
    </div>
  );
}
