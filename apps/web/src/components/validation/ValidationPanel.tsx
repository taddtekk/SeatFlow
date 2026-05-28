import type { ValidationResult } from "@seatflow/types";
import { AlertTriangle, Info, OctagonAlert, RefreshCw } from "../ui/Icons";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ValidationMessage } from "./ValidationMessage";

export function ValidationPanel({ onSelectObject, onValidate, validationResults }: { onSelectObject?: (objectId: string) => void; onValidate?: () => void; validationResults: ValidationResult }) {
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
          <p className="empty-panel-copy">Keine Fehler gefunden.</p>
        ) : (
          [
            { title: "Fehler", messages: errors },
            { title: "Warnungen", messages: warnings },
            { title: "Hinweise", messages: hints }
          ].map((group) =>
            group.messages.length > 0 ? (
              <section className="validation-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.messages.slice(0, 5).map((message) => (
                  <ValidationMessage
                    affectedObject={message.objectName ?? message.objectId ?? "Plan"}
                    key={message.id}
                    {...(message.objectId ? { onClick: () => onSelectObject?.(message.objectId as string) } : {})}
                    title={message.message}
                    tone={message.severity}
                  />
                ))}
              </section>
            ) : null
          )
        )}
      </div>

      <p className="validation-disclaimer">Diese Prüfung ersetzt keine behördliche oder brandschutztechnische Freigabe.</p>

      <Button className="validate-button" icon={<RefreshCw size={16} />} onClick={onValidate} variant="primary">
        Validierung erneut prüfen
      </Button>
    </Panel>
  );
}
