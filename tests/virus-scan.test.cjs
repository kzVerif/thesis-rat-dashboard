/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness loads isolated TypeScript modules without a bundler. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", "lib", file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), ...globals });
  return exports;
}
const protocol = load("virus-scan.ts");
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
function row(n, status = "RUNNING", job = id(50)) {
  return { job_id: job, request_id: id(n + 100), agent_id: id(n), scan_type: "quick", status, created_at: "2026-09-05T10:00:00Z" };
}
function harness() {
  const timers = new Map();
  const intervals = new Map();
  let timerId = 0;
  const { VirusScanClient } = load("virus-scan-client.ts", { "./virus-scan": protocol }, {
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    setInterval: fn => { intervals.set(++timerId, fn); return timerId; }, clearInterval: id => intervals.delete(id),
  });
  const sockets = [];
  const client = new VirusScanClient("wss://example.test/ws/frontend", () => {
    const socket = { readyState: 0, sent: [], send(data) { this.sent.push(JSON.parse(data)); }, close() { this.readyState = 3; this.onclose?.(); }, open() { this.readyState = 1; this.onopen(); }, message(data) { this.onmessage({ data: JSON.stringify(data) }); } };
    sockets.push(socket);
    return socket;
  });
  const stop = client.start();
  const socket = sockets[0];
  socket.open();
  return { client, socket, sockets, stop, poll: () => [...intervals.values()].forEach(fn => fn()), timeouts: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

test("payload enforces 1–100 unique UUID targets and one absolute custom path", () => {
  assert.equal(protocol.scanPayload("quick", [id(1)], "C:\\ignored").path, undefined);
  assert.equal(protocol.scanPayload("custom", [id(1)], "C:\\Downloads").path, "C:\\Downloads");
  assert.equal(protocol.validScanPath("\\\\server\\share\\folder"), true);
  for (const value of ["relative", "C:\\*", "C:\\a?", "C:\\a\nD:\\b"]) assert.equal(protocol.validScanPath(value), false);
  for (const ids of [[], [id(1), id(1)], ["invalid"], Array.from({ length: 101 }, (_, i) => id(i))]) assert.throws(() => protocol.scanPayload("quick", ids));
  const payload = protocol.scanPayload("full", [id(1)]);
  assert.equal(payload.job_id, undefined);
  assert.equal(payload.request_id, undefined);
});

test("partial history cannot finish a job; full target read can; terminal states never regress", () => {
  let jobs = protocol.mergeScanRows([], [row(1, "SUCCEEDED")]);
  assert.equal(protocol.jobFinished(jobs[0]), false);
  jobs = protocol.mergeScanRows(jobs, [row(1, "SUCCEEDED"), row(2, "EXPIRED")], id(50));
  assert.equal(protocol.jobFinished(jobs[0]), true);
  jobs = protocol.mergeScanRows(jobs, [row(1, "RUNNING")]);
  assert.equal(jobs[0].targets[0].status, "SUCCEEDED");
  jobs[0].expected = 3;
  assert.equal(protocol.jobFinished(jobs[0]), false);
});

test("serializes reads and creates, maps server IDs, polls and stops after full terminal results", async () => {
  const h = harness();
  const accepted = h.client.submit("quick", [id(1), id(2)]);
  assert.equal(h.socket.sent.length, 1);
  h.socket.message({ type: "virus_scan_list", scans: [] });
  assert.equal(h.socket.sent[1].type, "virus_scan");
  assert.throws(() => h.client.submit("quick", [id(1)]));
  h.socket.message({ type: "virus_scan_accepted", job_id: id(50), scan_type: "quick", total_targets: 2, targets: [1, 2].map(n => ({ agent_id: id(n), request_id: id(n + 100), dispatch: n === 1 ? "sent" : "uncertain" })) });
  assert.equal(await accepted, id(50));
  assert.equal(h.client.getSnapshot().jobs[0].targets[1].status, "QUEUED");
  assert.equal(h.socket.sent.at(-1).limit, 100);
  h.socket.message({ type: "virus_scan_list", job_id: id(50), scans: [row(1, "SUCCEEDED"), row(2, "FAILED")] });
  const count = h.socket.sent.length;
  h.poll();
  assert.equal(h.socket.sent.length, count);
  assert.equal(h.client.getSnapshot().jobs[0].targets[0].files, undefined);
  h.stop();
});

test("lost acceptance is uncertain, reconnect only reads history, requires explicit acknowledgement", async () => {
  const h = harness();
  h.socket.message({ type: "virus_scan_list", scans: [] });
  const pending = h.client.submit("full", [id(1)]);
  const rejection = assert.rejects(pending);
  h.socket.close();
  await rejection;
  assert.equal(h.client.getSnapshot().uncertain, true);
  h.timeouts();
  const next = h.sockets[1];
  next.open();
  assert.equal(next.sent.length, 1);
  assert.equal(next.sent[0].type, "virus_scan_list");
  h.client.acknowledgeUncertain();
  assert.equal(h.client.getSnapshot().uncertain, true);
  next.message({ type: "virus_scan_list", scans: [row(1)] });
  assert.equal(h.client.getSnapshot().uncertain, true);
  h.client.acknowledgeUncertain();
  assert.equal(h.client.getSnapshot().uncertain, false);
  assert.equal(next.sent.some(e => e.type === "virus_scan"), false);
  h.stop();
});

test("stream errors reject only AV commands and timeout does not fabricate a failed scan", async () => {
  const h = harness();
  h.socket.message({ type: "virus_scan_list", scans: [] });
  const pending = h.client.submit("quick", [id(1)]);
  const rejection = assert.rejects(pending, /offline/);
  h.socket.message({ type: "error", stream: "other", error: "unrelated" });
  assert.equal(h.client.getSnapshot().submitting, true);
  h.socket.message({ type: "error", stream: "virus_scan", error: "agent is offline" });
  await rejection;
  assert.equal(h.client.getSnapshot().uncertain, false);
  const timedOut = h.client.submit("quick", [id(1)]);
  const timeoutRejection = assert.rejects(timedOut);
  h.timeouts();
  await timeoutRejection;
  assert.equal(h.client.getSnapshot().uncertain, true);
  assert.equal(h.client.getSnapshot().jobs.length, 0);
  h.stop();
});

test("legacy single-agent acceptance is tracked using request_id", async () => {
  const h = harness();
  h.socket.message({ type: "virus_scan_list", scans: [] });
  const pending = h.client.submit("quick", [id(1)]);
  h.socket.message({ type: "virus_scan_accepted", agent_id: id(1), request_id: id(101), scan_type: "quick", dispatch: "sent" });
  assert.equal(await pending, id(101));
  assert.equal(h.socket.sent.at(-1).request_id, id(101));
  assert.equal(h.socket.sent.at(-1).job_id, undefined);
  h.stop();
});
