/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), ...globals });
  return exports;
}
const protocol = load("lib/virus-scan.ts");
const api = load("lib/av-scan-results.ts", { "./virus-scan": protocol });
const row = (id, status = "COMPLETED") => ({ id, agent_id: `agent-${id}`, command_id: `command-${id}`, job_id: "job-1", scan_type: "quick", status, created_at: "2026-09-08T00:00:00Z", started_at: null, finished_at: null, total_files_scanned: 20, threats_found: 1, threat_details: { name: "example" } });
const page = (rows, current = 1, total = rows.length, pages = 1) => ({ av_scan_results: rows, pagination: { page: current, limit: 100, total, total_pages: pages } });
function action(responses, session = { name: "__Host-session", value: "test" }) {
  const calls = [];
  const actions = load("actions/av-scan-results.ts", {
    "next/headers": { cookies: async () => ({ get: () => session }) },
    "@/lib/auth": { getApiUrl: () => "https://backend.test" },
    "@/lib/av-scan-results": api,
  }, { AbortSignal, fetch: async (url, init) => { calls.push({ url, init }); const response = responses.shift(); return { ok: true, json: async () => response, ...response }; } });
  return { ...actions, calls };
}
test("maps API states and preserves IDs and structured threat details without inventing job totals", () => {
  const jobs = api.resultJobs(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"].map((status, id) => row(String(id), status)));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].targets.map(t => t.status).join(","), "QUEUED,RUNNING,SUCCEEDED,FAILED,CANCELLED");
  assert.equal(jobs[0].targets[0].request_id, "0");
  assert.equal(jobs[0].targets[0].result.command_id, "command-0");
  assert.equal(jobs[0].targets[0].result.threat_details.name, "example");
  assert.equal(jobs[0].expected, undefined);
  assert.equal(protocol.jobFinished(jobs[0]), false);
});
test("loads every API page using authenticated uncached requests", async () => {
  const h = action([page([row("1")], 1, 2, 2), page([row("2")], 2, 2, 2)]);
  const result = await h.loadAvScanResults();
  assert.equal(result.ok, true);
  assert.equal(result.jobs[0].targets.length, 2);
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].url, "https://backend.test/api/av-scan-results?page=2&limit=100");
  assert.equal(h.calls[0].init.cache, "no-store");
  assert.equal(h.calls[0].init.headers.cookie, "__Host-session=test");
});
test("agent output, exit code, truncation and errors survive API parsing and mapping", () => {
  const event = { type: "virus_scan_result", report: { output: "line 1\n<script>example</script>\nภาษาไทย", exit_code: 0, output_truncated: true }, error: "agent error", message: "agent message" };
  const parsed = api.avScanResultsSchema.parse(page([{ ...row("output"), threat_details: event }]));
  const target = api.resultJobs(parsed.av_scan_results)[0].targets[0];
  assert.equal(target.result.report.output, event.report.output);
  assert.equal(target.result.report.exit_code, 0);
  assert.equal(target.result.report.output_truncated, true);
  assert.equal(target.result.error, "agent error");
  assert.equal(target.message, "agent message");
  assert.deepEqual(target.result.threat_details, event);
});
test("missing reports and empty output are kept distinct without fabricating output", () => {
  for (const threat_details of [null, [], "text", { report: null }, { report: [] }]) {
    const target = api.resultJobs([{ ...row("missing"), threat_details }])[0].targets[0];
    assert.equal(target.result.report, undefined);
  }
  const target = api.resultJobs([{ ...row("empty"), threat_details: { report: { output: "" } } }])[0].targets[0];
  assert.equal(target.result.report.output, "");
});
test("empty history succeeds; authentication, access, malformed data and shifting pages fail explicitly", async () => {
  assert.equal((await action([page([], 1, 0, 0)]).loadAvScanResults()).ok, true);
  const missing = action([], null);
  assert.equal((await missing.loadAvScanResults()).ok, false);
  assert.equal(missing.calls.length, 0);
  for (const responses of [[{ ok: false, status: 403 }], [{}], [page([row("1")], 1, 2, 2), page([row("2")], 2, 3, 2)], [page([row("1")], 1, 2, 2), page([row("1")], 2, 2, 2)]]) {
    assert.equal((await action(responses).loadAvScanResults()).ok, false);
  }
});
