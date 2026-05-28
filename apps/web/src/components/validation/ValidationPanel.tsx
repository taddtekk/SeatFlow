import { AlertTriangle, Info, OctagonAlert, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ValidationMessage } from "./ValidationMessage";

const messages = [
  {
    affectedObject: "Fluchtweg Süd",
    title: "Fluchtweg im Süden ist nur 1,80 m breit (mind. 2,00 m)",
    tone: "error" as const
  },
  {
    affectedObject: "Reihe 12, Sitz 5-8",
    title: "Stuhlreihe 12 überschneidet Sperrfläche links",
    tone: "error" as const
  },
  {
    affectedObject: "Reihe 3, links",
    title: "Abstand zwischen Stuhl und Fluchtweg ist < 50 cm",
    tone: "warning" as const
  },
  {
    affectedObject: "FOH",
    title: "FOH befindet sich sehr nah am Fluchtweg",
    tone: "warning" as const
  },
  {
    affectedObject: "Ausgang West",
    title: "Ausgang West ist nicht als barrierefreier Ausgang markiert",
    tone: "info" as const
  }
];

export function ValidationPanel({ onValidate }: { onValidate?: () => void }) {
  return (
    <Panel className="validation-panel">
      <div className="validation-heading">
        <h2>Validierung</h2>
        <div className="validation-summary">
          <span className="summary-error">
            <OctagonAlert size={14} /> Fehler <strong>2</strong>
          </span>
          <span className="summary-warning">
            <AlertTriangle size={14} /> Warnungen <strong>3</strong>
          </span>
          <span className="summary-info">
            <Info size={14} /> Hinweise <strong>1</strong>
          </span>
        </div>
      </div>

      <div className="validation-list">
        {messages.map((message) => (
          <ValidationMessage
            affectedObject={message.affectedObject}
            key={`${message.tone}-${message.title}`}
            title={message.title}
            tone={message.tone}
          />
        ))}
      </div>

      <Button className="validate-button" icon={<RefreshCw size={16} />} onClick={onValidate} variant="primary">
        Validierung erneut prüfen
      </Button>
    </Panel>
  );
}
