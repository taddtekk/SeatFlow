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
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const fileName = `seatflow-${safeName}-v${plan.version}-${timestamp}.pdf`;
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
    doc.fontSize(12).text(`Projekt: ${String(plan.metadata.projectName ?? plan.projectId)}`);
    doc.text(`Plan: ${plan.name}`);
    doc.text(`Version: ${plan.version}`);
    doc.text(`Datum: ${new Date().toLocaleString("de-DE")}`);
    doc.text(`Status: ${plan.status}`);
    doc.text(`Regelprofil: ${plan.ruleProfile.name}`);
    doc.moveDown();
    doc.text(`Anzahl Stühle: ${plan.chairs.length}`);
    doc.text(`Anzahl Tische: ${plan.tables.length}`);
    doc.text(`Anzahl Tischsitze: ${plan.tableSeats.length}`);
    doc.text(`Warnungen: ${validationResult.messages.filter((message) => message.severity === "warning").length}`);
    doc.text(`Fehler: ${validationResult.messages.filter((message) => message.severity === "error").length}`);
    doc.text("Maßstab: schematische Übersicht, alle Daten intern in Millimetern.");
    doc.moveDown();

    doc.fontSize(14).text("Einfache Planansicht");
    const originX = 60;
    const originY = doc.y + 10;
    const roomRect = plan.room.geometry.kind === "rect" ? plan.room.geometry.rect : { x: 0, y: 0, width: 40000, height: 32000 };
    const maxWidth = 480;
    const maxHeight = 310;
    const scale = Math.min(maxWidth / roomRect.width, maxHeight / roomRect.height);
    doc.rect(originX, originY, roomRect.width * scale, roomRect.height * scale).stroke("#222222");
    for (const object of plan.objects) {
      if (object.geometry.kind !== "rect") {
        continue;
      }
      const rect = object.geometry.rect;
      doc
        .rect(originX + (rect.x - roomRect.x) * scale, originY + (rect.y - roomRect.y) * scale, rect.width * scale, rect.height * scale)
        .fillOpacity(0.25)
        .fillAndStroke(colorForRole(object.role), "#333333")
        .fillOpacity(1);
    }
    for (const chair of plan.chairs) {
      doc
        .rect(originX + (chair.position.x - roomRect.x) * scale, originY + (chair.position.y - roomRect.y) * scale, chair.widthMm * scale, chair.depthMm * scale)
        .fillOpacity(0.6)
        .fillAndStroke("#2f6f9f", "#2f6f9f")
        .fillOpacity(1);
    }
    for (const seat of plan.tableSeats) {
      doc
        .rect(originX + ((seat.x ?? seat.position.x) - roomRect.x) * scale, originY + ((seat.y ?? seat.position.y) - roomRect.y) * scale, seat.widthMm * scale, seat.depthMm * scale)
        .fillOpacity(0.45)
        .fillAndStroke("#fef3c7", "#b45309")
        .fillOpacity(1);
    }
    for (const table of plan.tables) {
      const width = (table.type === "round" ? table.diameterMm ?? table.widthMm : table.widthMm) * scale;
      const height = (table.type === "round" ? table.diameterMm ?? table.depthMm : table.depthMm) * scale;
      const x = table.x ?? table.position.x;
      const y = table.y ?? table.position.y;
      if (table.type === "round") {
        doc.circle(originX + (x - roomRect.x) * scale + width / 2, originY + (y - roomRect.y) * scale + height / 2, width / 2).fillAndStroke("#8b6f47", "#333333");
      } else {
        doc.rect(originX + (x - roomRect.x) * scale, originY + (y - roomRect.y) * scale, width, height).fillAndStroke("#8b6f47", "#333333");
      }
    }

    doc.y = originY + roomRect.height * scale + 24;
    doc.fontSize(12).text("Legende");
    doc.fontSize(10).text("Bühne rot, FOH violett, Fluchtwege grün, Sperrflächen rosa, Bestuhlungsbereiche cyan, Tischbereiche orange, generierte Gänge hellgrün.");
    doc.moveDown();
    doc.addPage();
    doc.fontSize(18).text("Validierungsbericht");
    doc.moveDown(0.5);
    writeValidationSection(doc, "Fehler", validationResult.messages.filter((message) => message.severity === "error"));
    writeValidationSection(doc, "Warnungen", validationResult.messages.filter((message) => message.severity === "warning"));
    writeValidationSection(doc, "Hinweise", validationResult.messages.filter((message) => message.severity === "info"));
    doc.moveDown();
    doc.fontSize(10).text("Hinweis: Dieser Export ersetzt keine behördliche oder brandschutztechnische Freigabe.");
    doc.end();
  });

  const createdAtIso = new Date().toISOString();

  return {
    id: `export-${Date.now()}`,
    planId: plan.id,
    fileName,
    relativePath,
    url: `${options.appBaseUrl ?? ""}${urlPath}`,
    publicUrl: `${options.appBaseUrl ?? ""}${urlPath}`,
    createdAtIso,
    createdAt: createdAtIso
  };
}

function colorForRole(role: string): string {
  if (role === "stage") return "#d86c55";
  if (role === "foh") return "#6d62b7";
  if (role === "escape_route") return "#8ccf8f";
  if (role === "exit") return "#f0c75e";
  if (role === "seating_area") return "#38bdf8";
  if (role === "table_area") return "#f59e0b";
  if (role === "generated_aisle") return "#bbf7d0";
  return "#b26f8f";
}

function writeValidationSection(doc: PDFKit.PDFDocument, title: string, messages: ValidationResult["messages"]) {
  doc.fontSize(13).text(`${title}: ${messages.length}`);
  if (messages.length === 0) {
    doc.fontSize(10).text("Keine Meldungen.");
    doc.moveDown(0.4);
    return;
  }
  for (const message of messages.slice(0, 20)) {
    doc.fontSize(9).text(`- ${message.code ?? message.severity}: ${message.message}`);
  }
  doc.moveDown(0.5);
}
