import type { ReactNode } from "react";

export function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      <span className="action-button-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
