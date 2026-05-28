export function PropertyField({
  label,
  type = "text",
  value
}: {
  label: string;
  type?: "text" | "number" | "select";
  value: string;
}) {
  if (type === "select") {
    return (
      <label className="property-field">
        <span>{label}</span>
        <select defaultValue={value}>
          <option>{value}</option>
        </select>
      </label>
    );
  }

  return (
    <label className="property-field">
      <span>{label}</span>
      <input defaultValue={value} inputMode={type === "number" ? "numeric" : undefined} type="text" />
    </label>
  );
}
