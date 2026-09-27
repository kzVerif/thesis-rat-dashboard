/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "lib", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), ...globals });
  return exports;
}
const protocol = load("virus-scan.ts");
function harness() {
  const timers = new Map();
  let timerId = 0;
  const { AvScanRealtimeClient } = load("av-scan-realtime.ts", { "./virus-scan": protocol }, {
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
    setInterval: () => { throw new Error("Frontend polling is forbidden"); },
  });
  const sockets = [];
  const client = new AvScanRealtimeClient("wss://example.test/ws/frontend", () => {
    const socket = {
      readyState: 0, sent: [],
      send(value) { this.sent.push(JSON.parse(value)); },
      open() { this.readyState = 1; this.onopen(); },
      close() { this.readyState = 3; this.onclose?.(); },
      message(value) { this.onmessage({ data: JSON.stringify(value) }); },
    };
    sockets.push(socket);
    return socket;
  });
  const stop = client.start();
  const socket = sockets[0];
  socket.open();
  return { client, socket, sockets, timers, stop, tick() {
    const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn());
  } };
}
const row = (id, status) => ({
  agent_id: `agent-${id}`, request_id: id, job_id: "job-1", scan_type: "custom", status,
  path: "C:\\Downloads", created_at: "2026-09-05T10:00:00Z",
  result: { status: "completed", report: { exit_code: 0, output: "<script>ไทย</script>", output_truncated: true } },
});
const snapshot = scans => ({
  type: "virus_scan_snapshot",
  summary: { loaded_jobs: 1, pending_results: scans.filter(s => !protocol.isTerminal(s.status)).length,
    succeeded_results: scans.filter(s => s.status === "SUCCEEDED").length,
    failed_results: scans.filter(s => ["FAILED", "CANCELLED", "EXPIRED"].includes(s.status)).length },
  jobs: [{ job_id: "job-1", scan_type: "custom", created_at: "2026-09-05T10:00:00Z", scans }],
});

test("subscribes once, replaces snapshots including removed targets and empty history", () => {
  const h = harness();
  assert.deepEqual(h.socket.sent, [{ type: "virus_scan_subscribe", limit: 100 }]);
  h.socket.message(snapshot([row("1", "RUNNING"), row("2", "DELIVERED")]));
  assert.equal(h.client.getSnapshot().jobs[0].targets.length, 2);
  assert.equal(h.client.getSnapshot().summary.pending_results, 2);
  h.socket.message(snapshot([row("1", "SUCCEEDED")]));
  const state = h.client.getSnapshot();
  assert.equal(state.jobs[0].targets.length, 1);
  assert.equal(state.jobs[0].path, "C:\\Downloads");
  assert.equal(state.jobs[0].source, "realtime");
  assert.equal(protocol.jobFinished(state.jobs[0]), true);
  assert.equal(state.jobs[0].targets[0].result.report.output, "<script>ไทย</script>");
  assert.equal(state.jobs[0].targets[0].result.total_files_scanned, undefined);
  assert.equal(state.active, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.socket.sent.length, 1);
  h.socket.message({ type: "virus_scan_snapshot", summary: { loaded_jobs: 0, pending_results: 0, succeeded_results: 0, failed_results: 0 }, jobs: [] });
  assert.equal(h.client.getSnapshot().jobs.length, 0);
  assert.equal(h.client.getSnapshot().summary.loaded_jobs, 0);
  h.stop();
});

test("uses server summary including cancelled and expired results", () => {
  const h = harness();
  h.socket.message(snapshot([row("1", "FAILED"), row("2", "CANCELLED"), row("3", "EXPIRED")]));
  assert.equal(h.client.getSnapshot().summary.failed_results, 3);
  assert.equal(protocol.jobFinished(h.client.getSnapshot().jobs[0]), true);
  h.stop();
});

test("disconnect preserves scan state, reconnect subscribes without replaying commands", () => {
  const h = harness();
  h.socket.message(snapshot([row("1", "RUNNING")]));
  h.socket.close();
  assert.equal(h.client.getSnapshot().active, false);
  assert.equal(h.client.getSnapshot().jobs[0].targets[0].status, "RUNNING");
  h.tick();
  const next = h.sockets[1]; next.open();
  assert.deepEqual(next.sent, [{ type: "virus_scan_subscribe", limit: 100 }]);
  h.socket.message(snapshot([]));
  assert.equal(h.client.getSnapshot().jobs[0].targets.length, 1);
  next.message(snapshot([row("1", "SUCCEEDED")]));
  assert.equal(h.client.getSnapshot().active, true);
  h.stop();
  assert.equal(next.sent.at(-1).type, "virus_scan_unsubscribe");
  assert.equal(h.timers.size, 0);
});

test("stream error stops subscription until explicit retry; unrelated messages are ignored", () => {
  const h = harness();
  h.socket.message(snapshot([row("1", "RUNNING")]));
  h.socket.message({ type: "error", stream: "other", error: "ignore" });
  assert.equal(h.client.getSnapshot().error, null);
  h.socket.message({ type: "error", stream: "virus_scan", error: "ไม่มี permission" });
  assert.equal(h.client.getSnapshot().error, "ไม่มี permission");
  assert.equal(h.client.getSnapshot().active, false);
  h.socket.close();
  assert.equal(h.timers.size, 0);
  h.client.refresh();
  const next = h.sockets[1]; next.open();
  next.message(snapshot([row("1", "SUCCEEDED")]));
  assert.equal(h.client.getSnapshot().error, null);
  assert.equal(h.client.getSnapshot().active, true);
  h.stop();
});

test("missing and malformed snapshots expose retry without fabricating failed scans", () => {
  const h = harness();
  h.tick();
  assert.equal(h.client.getSnapshot().loading, false);
  assert.match(h.client.getSnapshot().error, /ยังไม่ได้รับ/);
  h.client.refresh();
  h.socket.message({ type: "virus_scan_snapshot", jobs: [] });
  assert.match(h.client.getSnapshot().error, /รูปแบบ/);
  assert.equal(h.client.getSnapshot().jobs.length, 0);
  h.stop();
  const restartStop = h.client.start();
  h.sockets[1].open();
  h.sockets[1].message(snapshot([]));
  assert.equal(h.client.getSnapshot().active, true);
  restartStop();
  assert.equal(h.timers.size, 0);
});
