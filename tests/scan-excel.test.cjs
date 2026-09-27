const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const ExcelJS = require("exceljs");

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  // ExcelJS checks instanceof Array, so execute in its realm as in the browser.
  vm.runInThisContext(`(function(exports, require) { ${code}\n})`)(exports, name => imports[name] ?? require(name));
  return exports;
}
const protocol = load("lib/virus-scan.ts");
const { buildScanWorkbook } = load("lib/scan-excel.ts", { "./virus-scan": protocol });

test("XLSX round trip preserves all results, Thai text and formula-like text", async () => {
  const targets = Array.from({ length: 12 }, (_, index) => ({
    agent_id: "agent", request_id: `result-${index}`, scan_type: "quick", status: "SUCCEEDED",
    created_at: "2026-09-01T00:00:00Z", finished_at: null,
    message: index === 0 ? "ไทย\n=1+1" : "ก".repeat(33000),
    result: { total_files_scanned: 0, threats_found: null },
  }));
  const job = { id: "job", mode: "quick", createdAt: targets[0].created_at, targets, source: "api", complete: false };
  const workbook = buildScanWorkbook(job, [{ id: "agent", hostname: "=1+1", ip: "10.0.0.1", room: "ห้องเรียน" }]);
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(read.worksheets.length, 1);
  const machines = read.worksheets[0];
  assert.deepEqual(machines.getRow(1).values.slice(1), [
    "ลำดับ", "ชื่อเครื่อง", "ห้อง", "สถานะสแกน", "ประเภทการสแกน",
    "IP", "เวลาสิ้นสุด (เวลาไทย)", "เส้นทางสแกน", "ข้อความ",
  ]);
  assert.equal(machines.columnCount, 9);
  assert.equal(machines.name, "ผลสแกนรายเครื่อง");
  assert.equal(machines.rowCount, 13);
  assert.equal(machines.getCell("B2").value, "=1+1");
  assert.equal(machines.getCell("C2").value, "ห้องเรียน");
  assert.equal(machines.getCell("D2").value, "สแกนเสร็จแล้ว");

  assert.equal(machines.getCell("E2").value, "สแกนด่วน (Quick)");
  assert.equal(machines.getCell("B2").type, ExcelJS.ValueType.String);
  assert.equal(machines.getCell("H2").value, "—");
  assert.equal(machines.getCell("I2").value, "ไทย\n=1+1");
  assert.ok(machines.getCell("I3").value.length <= 32767);
  assert.match(machines.getCell("I3").value, /ข้อความถูกตัดทอน/);
  assert.equal(machines.getCell("G2").value, "—");
});

test("message column exports agent output from realtime and stored reports before status messages", async () => {
  const results = [
    { report: { output: "=1+1\nผลสแกนภาษาไทย" } },
    { threat_details: { report: { output: "Defender stored output" } } },
    { report: { output: "latest output" }, threat_details: { report: { output: "stored output" } } },
    { report: null, threat_details: { report: { output: "fallback output" } } },
    {},
    { report: { output: "" } },
    { report: { output: "ก".repeat(33000) } },
  ];
  const job = { id: "job", mode: "quick", source: "realtime", targets: results.map((result, index) => ({
    agent_id: "agent", request_id: String(index), scan_type: "quick", status: "SUCCEEDED",
    message: "status message", result,
  })) };
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(await buildScanWorkbook(job, []).xlsx.writeBuffer());
  const sheet = read.worksheets[0];
  assert.equal(sheet.getCell("I2").value, "=1+1\nผลสแกนภาษาไทย");
  assert.equal(sheet.getCell("I2").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("I3").value, "Defender stored output");
  assert.equal(sheet.getCell("I4").value, "latest output");
  assert.equal(sheet.getCell("I5").value, "fallback output");
  assert.equal(sheet.getCell("I6").value, "status message");
  assert.ok(["", null].includes(sheet.getCell("I7").value));
  assert.match(sheet.getCell("I8").value, /ข้อความถูกตัดทอน/);
  assert.ok(sheet.getCell("I8").value.length <= 32767);
});
