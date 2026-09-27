import ExcelJS from "exceljs";
import type { ScanComputer } from "@/app/(system)/av-scans/_lib/types";
import { statusLabels, type ScanJob } from "./virus-scan";

const scanModes = { quick: "สแกนด่วน (Quick)", full: "สแกนทั้งเครื่อง (Full)", custom: "สแกนเส้นทางที่กำหนด (Custom)" };

const date = (value?: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
    : "—";

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

// Excel limits text cells to 32,767 characters; explicitly mark shortened output.
function cell(value: unknown): string | number | boolean {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  const text = value == null ? "—" : typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 32767 ? text.slice(0, 32700) + "\n[ข้อความถูกตัดทอนสำหรับ Excel]" : text;
}

export function buildScanWorkbook(job: ScanJob, computers: ScanComputer[], exportedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RAT System";
  workbook.created = exportedAt;
  const machines = workbook.addWorksheet("ผลสแกนรายเครื่อง", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  });
  machines.columns = [
    { header: "ลำดับ", width: 8 },
    { header: "ชื่อเครื่อง", width: 25 },
    { header: "ห้อง", width: 22 },
    { header: "สถานะสแกน", width: 24 },
    { header: "ประเภทการสแกน", width: 34 },
    { header: "IP", width: 18 },
    { header: "เวลาสิ้นสุด (เวลาไทย)", width: 28 },
    { header: "เส้นทางสแกน", width: 35 },
    { header: "ข้อความ", width: 45 },
  ];
  const inventory = new Map(computers.map(computer => [computer.id, computer]));
  for (const [index, target] of job.targets.entries()) {
    const computer = inventory.get(target.agent_id);
    const result = target.result;
    const report = record(result?.report);
    const storedReport = record(record(result?.threat_details)?.report);
    const output = typeof report?.output === "string" ? report.output
      : typeof storedReport?.output === "string" ? storedReport.output : undefined;
    const message = output ?? target.message;
    const status = job.source === "api" && target.status === "QUEUED"
      ? "รอดำเนินการ (PENDING)" : statusLabels[target.status];
    const machineRow = machines.addRow([
      index + 1, computer?.hostname ?? target.agent_id, computer?.room,
      status, scanModes[target.scan_type], computer?.ip, date(target.finished_at),
      target.path ?? job.path, message,
    ].map(cell));
    const messageLines = typeof message === "string"
      ? message.split(/\r?\n/).reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 45)), 0) : 1;
    machineRow.height = Math.min(180, Math.max(36, messageLines * 15));
  }
  machines.autoFilter = { from: { row: 1, column: 1 }, to: { row: machines.rowCount, column: machines.columns.length } };
  for (const sheet of workbook.worksheets) {
    sheet.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    sheet.getRow(1).height = 30;
  }
  return workbook;
}

export async function exportScanExcel(job: ScanJob, computers: ScanComputer[]) {
  const buffer = await buildScanWorkbook(job, computers).xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `AV-Scan-${job.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}.xlsx`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
