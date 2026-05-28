import type { ReactNode } from "react";

export interface InfoCardProps {
  label: string;
  value: ReactNode;
}

export function InfoCard({ label, value }: InfoCardProps) {
  return (
    <section className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
