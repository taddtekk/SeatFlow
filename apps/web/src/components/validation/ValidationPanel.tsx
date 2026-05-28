import type { ValidationResult } from "@seatflow/types";
import { AlertTriangle, Info, OctagonAlert, RefreshCw } from "../ui/Icons";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ValidationMessage } from "./ValidationMessage";

export function ValidationPanel({ onValidate, validationResults }: { onValidate?: () => void; validationResults: ValidationResult }) {
  const errors = validationResults.messages.filter((message) => message.severity === "error");
  const warnings = validationResults.messages.filter((message) => message.severity === "warning");
  const hints = validationResults.messages.filter((message) => message.severity === "info");

  return (
    <Panel className="validation-panel">
      <div className="validation-heading">
        <h2>Validierung</h2>
        <div className="validation-summary">
          <span className="summary-error">
            <OctagonAlert size={14} /> Fehler <strong>{errors.length}</strong>
          </span>
          <span className="summary-warning">
            <AlertTriangle size={14} /> Warnungen <strong>{warnings.length}</strong>
          </span>
          <span className="summary-info">
            <Info size={14} /> Hinweise <strong>{hints.length}</strong>
          </span>
        </div>
      </div>

      <div className="validation-list">
        {validationResults.messages.length === 0 ? (
          <p className="empty-panel-copy">Keine Validierungsmeldungen.</p>
        ) : (
          validationResults.messages.slice(0, 8).map((message) => (
            <ValidationMessage
              affectedObject={message.objectId ?? "Plan"}
              key={message.id}
              title={message.message}
              tone={message.severity}
            />
          ))
        )}
      </div>

      <Button className="validate-button" icon={<RefreshCw size={16} />} onClick={onValidate} variant="primary">
        Validierung erneut prüfen
      </Button>
    </Panel>
  );
}
