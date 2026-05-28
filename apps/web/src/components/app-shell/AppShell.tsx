"use client";

import type { Plan, ToolType } from "@seatflow/types";
import { useMemo, useState } from "react";
import { PlannerCanvas } from "../planner-canvas/PlannerCanvas";
import { PropertiesPanel } from "../properties-panel/PropertiesPanel";
import { StatusBar } from "../status-bar/StatusBar";
import { ToolSidebar } from "../tool-sidebar/ToolSidebar";
import { TopBar } from "../top-bar/TopBar";
import { ValidationPanel } from "../validation/ValidationPanel";

export function AppShell({ initialPlan }: { initialPlan: Plan }) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [plan, setPlan] = useState(initialPlan);
  const [notice, setNotice] = useState<string | null>(null);

  const exportPlan = useMemo(
    () => ({
      ...plan,
      name: "Hauptbühne - Variante 3",
      projectId: "Sommerkonzert 2026"
    }),
    [plan]
  );

  async function recalculateSeating() {
    setNotice("Bestuhlung wird neu berechnet...");
    const response = await fetch("/api/generate-seating", {
      body: JSON.stringify(plan),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      setNotice("Bestuhlung konnte nicht neu berechnet werden.");
      return;
    }

    const nextPlan = (await response.json()) as Plan;
    setPlan(nextPlan);
    setNotice("Bestuhlung wurde neu berechnet.");
  }

  async function exportPdf() {
    setNotice("PDF-Export wird vorbereitet...");
    const response = await fetch("/api/export/pdf", {
      body: JSON.stringify(exportPlan),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      setNotice("PDF-Export konnte nicht erstellt werden.");
      return;
    }

    const result = (await response.json()) as { url: string };
    setNotice(`PDF exportiert: ${result.url}`);
  }

  return (
    <main className="seatflow-app">
      <TopBar onExportPdf={exportPdf} onRecalculate={recalculateSeating} />
      <div className="editor-shell">
        <ToolSidebar activeTool={activeTool} onExportPdf={exportPdf} onRecalculate={recalculateSeating} onToolChange={setActiveTool} />
        <div className="workspace">
          <PlannerCanvas />
          <StatusBar />
          {notice ? <div className="toast-status">{notice}</div> : null}
        </div>
        <aside className="right-sidebar" aria-label="Eigenschaften und Validierung">
          <PropertiesPanel />
          <ValidationPanel onValidate={() => setNotice("Validierung wurde erneut geprüft.")} />
        </aside>
      </div>
    </main>
  );
}
