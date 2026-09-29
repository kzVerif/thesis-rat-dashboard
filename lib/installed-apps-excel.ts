import ExcelJS from "exceljs";
import { formatInstallDate, formatInstalledSize, type InstalledApp } from "./installed-apps";

function agentText(value?: string): string {
  if (!value?.trim()) return "-";
  // Store strings, never ExcelJS formula objects. The apostrophe additionally
  // neutralizes formula prefixes, including those hidden behind whitespace.
  return /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
}

export function installedAppsFilename(hostname: string, exportedAt = new Date()) {
  const host = hostname.trim().replace(/[<>:"/\\|?*\p{Cc}]/gu, "_").slice(0, 120).replace(/[. ]+$/u, "") || "agent";
  const date = [exportedAt.getFullYear(), String(exportedAt.getMonth() + 1).padStart(2, "0"), String(exportedAt.getDate()).padStart(2, "0")].join("-");
  return `installed-applications-${host}-${date}.xlsx`;
}

export function buildInstalledAppsWorkbook(apps: readonly InstalledApp[], exportedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RAT System";
  workbook.created = exportedAt;
  const sheet = workbook.addWorksheet("Installed Applications", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "No.", width: 8 },
    { header: "Application", width: 48 },
    { header: "Version", width: 24 },
    { header: "Publisher", width: 36 },
    { header: "Installed Date", width: 20 },
    { header: "Size", width: 18 },
  ];
  for (const [index, app] of apps.entries()) {
    const installed = formatInstallDate(app.install_date);
    const size = formatInstalledSize(app.estimated_size_kb);
    sheet.addRow([
      index + 1,
      agentText(app.name),
      agentText(app.version),
      agentText(app.publisher),
      installed === "—" ? "-" : installed,
      size === "—" ? "-" : size,
    ]);
  }
  // Text number format also preserves version strings such as 001.02.
  for (let column = 2; column <= 6; column++) sheet.getColumn(column).numFmt = "@";
  sheet.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; });
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  header.height = 30;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: 6 } };
  return workbook;
}

export async function exportInstalledAppsExcel(apps: readonly InstalledApp[], hostname: string) {
  const exportedAt = new Date();
  const buffer = await buildInstalledAppsWorkbook(apps, exportedAt).xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = installedAppsFilename(hostname, exportedAt);
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
