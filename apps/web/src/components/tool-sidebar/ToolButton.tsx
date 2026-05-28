import type { ReactNode } from "react";

export function ToolButton({
  active = false,
  icon,
  label,
  onClick
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button className={`tool-button ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <span className="tool-button-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
