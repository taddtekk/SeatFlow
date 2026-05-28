import type { ReactNode } from "react";

type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`sf-badge sf-badge-${tone}`}>{children}</span>;
}
