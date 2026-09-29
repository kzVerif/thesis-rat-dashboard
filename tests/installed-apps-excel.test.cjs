/* eslint-disable @typescript-eslint/no-require-imports -- Existing isolated Node/TypeScript test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const fs = require("node:fs");
const ts = require("typescript");
const { load } = require("./power-test-helpers.cjs");
const inventory = load("lib/installed-apps.ts");
const imports = { exceljs: { default: ExcelJS }, "./installed-apps": inventory };
// ExcelJS checks row arrays with instanceof Array, so run this module in the
// same realm as ExcelJS instead of the VM realm used by the controller harness.
function loadExcel(globals = {}) {
  const code = ts.transpileModule(fs.readFileSync("lib/installed-apps-excel.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", ...Object.keys(globals), code)(name => imports[name] ?? require(name), exports, ...Object.values(globals));
  return exports;
}
const excel = loadExcel();

async function roundTrip(apps) {
  const bytes = await excel.buildInstalledAppsWorkbook(apps).xlsx.writeBuffer();
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(bytes);
  return read.worksheets[0];
}

test("XLSX exports every supplied row with six columns, readable formatting and header styling", async () => {
  const apps = [
    { name: "Editor", version: "001.02", publisher: "ผู้เผยแพร่", install_date: "20240229", estimated_size_kb: 2048 },
    { name: "Browser", install_date: "20260230" },
    { name: "Tool", estimated_size_kb: 1048576 },
    { name: "Empty size", estimated_size_kb: 0 },
  ];
  const before = JSON.stringify(apps);
  assert.equal(inventory.filterInstalledApps(apps, "Editor").length, 1);
  const sheet = await roundTrip(apps);
  assert.equal(sheet.rowCount, 5);
  assert.deepEqual(sheet.getRow(1).values.slice(1), ["No.", "Application", "Version", "Publisher", "Installed Date", "Size"]);
  assert.deepEqual(sheet.getRow(2).values.slice(1), [1, "Editor", "001.02", "ผู้เผยแพร่", "2024-02-29", "2.0 MB"]);
  assert.deepEqual(sheet.getRow(3).values.slice(1), [2, "Browser", "-", "-", "-", "-"]);
  assert.equal(sheet.getCell("F4").value, "1.0 GB");
  assert.equal(sheet.getCell("F5").value, "0 KB");
  assert.equal(sheet.getCell("C2").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("C2").numFmt, "@");
  assert.equal(sheet.getCell("A1").font.bold, true);
  assert.equal(sheet.getCell("A1").fill.fgColor.argb, "FF1E3A5F");
  assert.equal(sheet.views[0].state, "frozen");
  assert.equal(sheet.views[0].ySplit, 1);
  assert.equal(sheet.autoFilter, "A1:F5");
  assert.equal(sheet.getColumn(2).width, 48);
  assert.equal(JSON.stringify(apps), before);
});

test("Agent formula prefixes, whitespace prefixes and DDE expressions stay inert text after serialization", async () => {
  const values = ["=1+1", "+SUM(A1:A2)", "-1+1", "@SUM(A1)", "\t=HYPERLINK(\"https://example.test\")", " \r\n+1", "=cmd|' /C calc'!A0"];
  const sheet = await roundTrip(values.map(value => ({ name: value, version: value, publisher: value })));
  for (let i = 0; i < values.length; i++) {
    for (const column of [2, 3, 4]) {
      const cell = sheet.getCell(i + 2, column);
      assert.equal(cell.type, ExcelJS.ValueType.String);
      assert.equal(cell.formula, undefined);
      // XML normalizes CRLF to LF when ExcelJS reloads shared strings.
      assert.equal(cell.value, "'" + values[i].replace(/\r\n/g, "\n"));
    }
  }
});

test("filename uses local calendar date and a safe hostname", () => {
  const date = new Date(2026, 8, 29, 0, 5);
  assert.equal(excel.installedAppsFilename("LAB-PC-07", date), "installed-applications-LAB-PC-07-2026-09-29.xlsx");
  assert.equal(excel.installedAppsFilename("  ห้องแล็บ/PC:*?\n ", date), "installed-applications-ห้องแล็บ_PC___-2026-09-29.xlsx");
  assert.equal(excel.installedAppsFilename("  ", date), "installed-applications-agent-2026-09-29.xlsx");
});

test("client download creates an XLSX blob and cleans up without using WebSocket or fetch", async () => {
  let blob, clicked = 0, removed = 0, appended = 0, cleanup, revoked;
  const link = { click: () => clicked++, remove: () => removed++ };
  const client = loadExcel({
    Blob,
    URL: { createObjectURL: value => { blob = value; return "blob:inventory"; }, revokeObjectURL: value => { revoked = value; } },
    document: { createElement: tag => { assert.equal(tag, "a"); return link; }, body: { appendChild: () => appended++ } },
    setTimeout: fn => { cleanup = fn; },
    WebSocket: class { constructor() { throw new Error("unexpected network request"); } },
    fetch: () => { throw new Error("unexpected network request"); },
  });
  await client.exportInstalledAppsExcel([{ name: "Application" }], "LAB-PC");
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(clicked, 1); assert.equal(removed, 1); assert.equal(appended, 1);
  assert.equal(link.href, "blob:inventory");
  assert.match(link.download, /^installed-applications-LAB-PC-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await blob.arrayBuffer()));
  assert.equal(workbook.worksheets[0].getCell("B2").value, "Application");
  cleanup(); assert.equal(revoked, "blob:inventory");
});
