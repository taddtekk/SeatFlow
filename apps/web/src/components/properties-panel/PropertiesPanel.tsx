import { SquareStack, Trash2, X } from "lucide-react";
import { Button, IconButton } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { PropertyField } from "./PropertyField";

export function PropertiesPanel() {
  return (
    <Panel className="properties-panel">
      <div className="panel-heading">
        <h2>Eigenschaften</h2>
        <IconButton aria-label="Eigenschaften schließen" icon={<X size={17} />} />
      </div>

      <section className="selected-object-card">
        <span className="object-swatch">
          <SquareStack size={20} />
        </span>
        <div>
          <p>Ausgewähltes Objekt</p>
          <strong>Bühne</strong>
          <span>ID: obj_4f85e2</span>
        </div>
      </section>

      <div className="property-grid">
        <PropertyField label="Typ" type="select" value="Bühne" />
        <PropertyField label="Name" value="Bühne" />
        <PropertyField label="Position X (mm)" type="number" value="12000" />
        <PropertyField label="Position Y (mm)" type="number" value="1000" />
        <PropertyField label="Breite (mm)" type="number" value="16000" />
        <PropertyField label="Tiefe (mm)" type="number" value="6000" />
        <PropertyField label="Rotation" type="select" value="0°" />
        <PropertyField label="Höhe (mm)" type="number" value="1200" />
      </div>

      <section className="additional-properties">
        <h3>Zusätzliche Eigenschaften</h3>
        <div className="color-property">
          <span>Hintergrundfarbe</span>
          <button aria-label="Hintergrundfarbe" className="color-swatch" type="button" />
        </div>
        <PropertyField label="Notiz" value="Hauptbühne, erhöht" />
      </section>

      <Button className="delete-object-button" icon={<Trash2 size={16} />} variant="danger">
        Objekt löschen
      </Button>
    </Panel>
  );
}
