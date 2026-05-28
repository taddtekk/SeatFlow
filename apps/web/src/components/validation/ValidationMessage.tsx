import { AlertTriangle, ChevronRight, Info, OctagonAlert } from "lucide-react";

type ValidationTone = "error" | "warning" | "info";

const iconByTone = {
  error: <OctagonAlert size={15} />,
  warning: <AlertTriangle size={15} />,
  info: <Info size={15} />
};

export function ValidationMessage({
  affectedObject,
  title,
  tone
}: {
  affectedObject: string;
  title: string;
  tone: ValidationTone;
}) {
  return (
    <button className={`validation-message validation-message-${tone}`} type="button">
      <span className="validation-icon">{iconByTone[tone]}</span>
      <span className="validation-copy">
        <strong>{title}</strong>
        <small>{affectedObject}</small>
      </span>
      <ChevronRight size={15} />
    </button>
  );
}
