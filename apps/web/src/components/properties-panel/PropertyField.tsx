export function PropertyField({
  label,
  onChange,
  options,
  type = "text",
  value
}: {
  label: string;
  onChange?: (value: string) => void;
  options?: string[];
  type?: "text" | "number" | "select";
  value: string;
}) {
  if (type === "select") {
    return (
      <label className="property-field">
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange?.(event.target.value)} disabled={!onChange}>
          {(options ?? [value]).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="property-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange?.(event.target.value)} readOnly={!onChange} inputMode={type === "number" ? "numeric" : undefined} type="text" />
    </label>
  );
}
