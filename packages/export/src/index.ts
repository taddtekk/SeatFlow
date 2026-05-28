import type { ExportResult, Plan, ValidationResult } from "@seatflow/types";
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface PdfExportOptions {
  publicDir: string;
  exportDir: string;
  appBaseUrl?: string;
}

export async function exportPlanPdf(plan: Plan, validationResult: ValidationResult, options: PdfExportOptions): Promise<ExportResult> {
  mkdirSync(options.exportDir, { recursive: true });
  const safeName = plan.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "plan";
  const fileName = `seatflow-${safeName}-${Date.now()}.pdf`;
  const absolutePath = join(options.exportDir, fileName);
  const relativePath = `public/exports/${fileName}`;
  const urlPath = `/exports/${fileName}`;

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = createWriteStream(absolutePath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.pipe(stream);

    doc.fontSize(22).text("SeatFlow Plan");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Projekt: ${plan.projectId}`);
    doc.text(`Plan: ${plan.name}`);
    doc.text(`Datum: ${new Date().toLocaleString("de-DE")}`);
    doc.text(`Status: ${plan.status}`);
    doc.moveDown();
    doc.text(`Anzahl Stühle: ${plan.chairs.length}`);
    doc.text(`Anzahl Tische: ${plan.tables.length}`);
    doc.text(`Warnungen: ${validationResult.messages.filter((message) => message.severity === "warning").length}`);
    doc.text(`Fehler: ${validationResult.messages.filter((message) => message.severity === "error").length}`);
    doc.moveDown();

    doc.fontSize(14).text("Einfache Planansicht");
    const originX = 60;
    const originY = doc.y + 10;
    const scale = 0.015;
    doc.rect(originX, originY, plan.room.geometry.kind === "rect" ? plan.room.geometry.rect.width * scale : 420, plan.room.geometry.kind === "rect" ? plan.room.geometry.rect.height * scale : 280).stroke("#222222");
    for (const object of plan.objects) {
      if (object.geometry.kind !== "rect") {
        continue;
      }
      const rect = object.geometry.rect;
      doc.rect(originX + rect.x * scale, originY + rect.y * scale, rect.width * scale, rect.height * scale).fillOpacity(0.25).fillAndStroke(colorForRole(object.role), "#333333").fillOpacity(1);
    }
    for (const table of plan.tables) {
      const width = (table.diameterMm ?? table.widthMm) * scale;
      const height = (table.diameterMm ?? table.depthMm) * scale;
      doc.rect(originX + table.position.x * scale, originY + table.position.y * scale, width, height).fillAndStroke("#8b6f47", "#333333");
    }

    doc.moveDown(14);
    doc.fontSize(12).text("Legende: Bühne, FOH, Fluchtwege, Sperrflächen, Ausgänge, Tische und Bestuhlung werden schematisch dargestellt.");
    doc.moveDown();
    doc.fontSize(10).text("Hinweis: Dieser Export ersetzt keine behördliche oder brandschutztechnische Freigabe.");
    doc.end();
  });

  return {
    id: `export-${Date.now()}`,
    planId: plan.id,
    fileName,
    relativePath,
    url: `${options.appBaseUrl ?? ""}${urlPath}`,
    createdAtIso: new Date().toISOString()
  };
}

function colorForRole(role: string): string {
  if (role === "stage") return "#d86c55";
  if (role === "foh") return "#6d62b7";
  if (role === "escape_route") return "#8ccf8f";
  if (role === "exit") return "#f0c75e";
  return "#b26f8f";
}
