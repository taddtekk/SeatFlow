const rulerMarks = ["0m", "5m", "10m", "15m", "20m", "25m", "30m", "35m", "40m"];

export function Ruler({ orientation }: { orientation: "horizontal" | "vertical" }) {
  return (
    <div className={`ruler ruler-${orientation}`} aria-hidden="true">
      {rulerMarks.map((mark, index) => (
        <span key={mark} style={{ [orientation === "horizontal" ? "left" : "top"]: `${index * 12.5}%` }}>
          {mark}
        </span>
      ))}
    </div>
  );
}
