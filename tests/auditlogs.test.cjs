/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), ...globals });
  return exports;
}
const types = load("app/(system)/auditlogs/_lib/types.ts");
const id = "ec3bd54d-5d28-4ea6-aaf8-0a3916fdf08a";
const query = { page: 2, limit: 20, user_id: "", target_agent_id: "", action: "POST /api/rooms/", from: "2026-09-13T00:00:00+07:00", to: "2026-09-13T10:00:00Z" };
const row = { id, user_id: null, username: null, display_name: null, action: query.action, target_agent_id: null, agent_hostname: null, detail: { actor_username: "deleted-user", resource_id: id }, ip_address: null, created_at: query.to };
function server(payload, status = 200, session = { name: "__Host-session", value: "test" }) {
  const calls = [];
  const api = load("app/(system)/auditlogs/_lib/auditlogs-server.ts", {
    "server-only": {}, "./types": types,
    "next/headers": { cookies: async () => ({ get: () => session }) },
    "@/lib/auth": { getApiUrl: () => "https://backend.test" },
  }, { URLSearchParams, AbortSignal, fetch: async (url, init) => { calls.push({ url, init }); return { ok: status === 200, status, json: async () => typeof payload === "function" ? payload(url) : payload }; } });
  return { ...api, calls };
}
test("forwards session, exact filters and pagination without caching", async () => {
  const api = server({ logs: [row], pagination: { page: 2, limit: 20, total: 21, total_pages: 2 } });
  const result = await api.getAuditLogs(query);
  const url = new URL(api.calls[0].url);
  assert.equal(url.pathname, "/api/logs");
  for (const key of ["action", "from", "to"]) assert.equal(url.searchParams.get(key), query[key]);
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.has("user_id"), false);
  assert.equal(api.calls[0].init.headers.cookie, "__Host-session=test");
  assert.equal(api.calls[0].init.cache, "no-store");
  assert.equal(result.logs[0].detail.actor_username, "deleted-user");
});
test("accepts empty pages and unwrapped detail with nullable identities", async () => {
  const api = server({ logs: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } });
  assert.equal((await api.getAuditLogs({ ...query, page: 1 })).logs.length, 0);
  const detail = server(row);
  assert.equal((await detail.getAuditLog(id)).id, id);
  assert.equal(detail.calls[0].url, `https://backend.test/api/logs/${id}`);
});
test("rejects invalid filters before requesting backend", async () => {
  const api = server({});
  for (const change of [{ user_id: "bad" }, { limit: 101 }, { page: 0 }, { from: "invalid" }, { from: "2027-01-01T00:00:00Z" }]) await assert.rejects(api.getAuditLogs({ ...query, ...change }));
  assert.equal(api.calls.length, 0);
});
test("surfaces auth, permission, missing detail and server failures", async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) await assert.rejects(server({}, status).getAuditLog(id));
  const anonymous = server({}, 200, null);
  await assert.rejects(anonymous.getAuditLogs(query));
  assert.equal(anonymous.calls.length, 0);
  await assert.rejects(server({ logs: null }).getAuditLogs(query), /API/);
});

test("returns to page one when retention removes the requested page, preserving filters", async () => {
  const api = server(url => {
    const page = Number(new URL(url).searchParams.get("page"));
    return { logs: page === 1 ? [row] : [], pagination: { page, limit: 20, total: 1, total_pages: 1 } };
  });
  const result = await api.getAuditLogs(query);
  assert.equal(result.pagination.page, 1);
  assert.equal(result.logs.length, 1);
  assert.equal(api.calls.length, 2);
  const retry = new URL(api.calls[1].url);
  for (const key of ["action", "from", "to"]) assert.equal(retry.searchParams.get(key), query[key]);
});

test("stops after one recovery request when retention removes all records", async () => {
  const api = server(url => ({ logs: [], pagination: { page: Number(new URL(url).searchParams.get("page")), limit: 20, total: 0, total_pages: 0 } }));
  const result = await api.getAuditLogs(query);
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.total, 0);
  assert.equal(api.calls.length, 2);
});

test("explains expired detail and throttling without automatically retrying", async () => {
  const missing = server({}, 404);
  await assert.rejects(missing.getAuditLog(id), /อายุการเก็บข้อมูล/);
  const throttled = server({}, 429);
  await assert.rejects(throttled.getAuditLogs(query), /รอสักครู่/);
  assert.equal(throttled.calls.length, 1);
});
