import type { ReactNode } from "react";

export function DisplayToggle({
  checked,
  icon,
  label,
  onChange
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="display-toggle">
      <span className="display-toggle-label">
        {icon}
        <span>{label}</span>
      </span>
      <input checked={checked} onChange={(event) => onChange?.(event.target.checked)} type="checkbox" />
      <span className="display-toggle-switch" aria-hidden="true" />
    </label>
  );
}
