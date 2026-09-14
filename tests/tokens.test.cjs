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
const root = "app/(system)/tokens/_lib/";
const types = load(`${root}types.ts`);
const id = "bca376bb-7e48-4d75-afaa-e6b75b597c60";
const row = { id, token: "server-generated-value", token_type: "api_key", used_count: 3, is_revoked: false, created_at: "2026-09-13T10:00:00Z" };
function client(responses) {
  const calls = [];
  const api = load(`${root}tokensClient.ts`, { "./types": types }, { fetch: async (url, init) => {
    calls.push({ url, init });
    const response = responses.shift();
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  } });
  return { ...api, calls };
}
function proxy({ status = 200, body = { tokens: [row] }, session = { name: "__Host-session", value: "session-test" }, fail = false } = {}) {
  const calls = [];
  const api = load("app/api/tokens/[[...path]]/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => session }) },
    "@/lib/auth": { getApiUrl: () => "https://backend.test" },
    "@/app/(system)/tokens/_lib/types": types,
  }, { Response, URL, AbortSignal, fetch: async (url, init) => { calls.push({ url, init }); if (fail) throw new Error("offline"); return new Response(JSON.stringify(body), { status }); } });
  return { calls, invoke: (method, path = [], requestBody, headers = {}) => api[method](new Request(`https://dashboard.test/api/tokens${path.length ? `/${path.join("/")}` : ""}`, { method, headers, ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }) }), { params: Promise.resolve({ path }) }) };
}
test("reads omitted nullable fields without inventing quotas, associations or expiry", () => {
  const parsed = types.tokensSchema.parse({ tokens: [row] }).tokens[0];
  assert.equal(parsed.max_use, undefined);
  assert.equal(parsed.expires_at, undefined);
  assert.equal(parsed.user_id, undefined);
  assert.equal(types.getTokenStatus(parsed).label, "พร้อมใช้งาน");
  assert.equal(types.tokensSchema.parse({ tokens: [] }).tokens.length, 0);
});
test("status follows revoke, expiration and usage precedence without consuming a token", () => {
  const now = Date.parse("2026-09-13T10:00:00Z");
  assert.equal(types.getTokenStatus({ ...row, is_revoked: true, max_use: 1 }, now).label, "เพิกถอนแล้ว");
  assert.equal(types.getTokenStatus({ ...row, expires_at: "2026-09-12T00:00:00Z", max_use: 1 }, now).label, "หมดอายุ");
  assert.equal(types.getTokenStatus({ ...row, max_use: 3 }, now).label, "ใช้ครบแล้ว");
  assert.equal(types.getTokenStatus({ ...row, expires_at: "2026-09-13T10:00:00Z" }, now).label, "พร้อมใช้งาน");
});
test("blank constraints clear limits and exact local datetimes become RFC3339", () => {
  const empty = types.parseTokenConstraints("", "");
  assert.equal(empty.max_use, null);
  assert.equal(empty.expires_at, null);
  const value = "2026-12-31T23:59:59";
  const parsed = types.parseTokenConstraints("100", value);
  assert.equal(parsed.max_use, 100);
  assert.equal(parsed.expires_at, new Date(value).toISOString());
  assert.equal(types.localDateTime(parsed.expires_at), value);
  for (const invalid of ["abc", "1.2", "-1", "0"]) assert.throws(() => types.parseTokenConstraints(invalid, ""));
  assert.throws(() => types.parseTokenConstraints("", "bad-date"));
});
test("list uses one authenticated uncached GET with no invented pagination", async () => {
  const api = client([{ body: { tokens: [row] } }]);
  assert.equal((await api.listTokens()).tokens[0].token, row.token);
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].url, "/api/tokens");
  assert.equal(api.calls[0].init.method, "GET");
  assert.equal(api.calls[0].init.credentials, "include");
  assert.equal(api.calls[0].init.cache, "no-store");
});
test("creation uses server token and permits defaults or optional associations", async () => {
  const api = client([{ status: 201, body: { id, token: row.token } }, { status: 201, body: { id, token: row.token } }]);
  assert.equal((await api.createToken()).token, row.token);
  assert.equal(api.calls[0].init.body, "{}");
  await api.createToken({ user_id: id, agent_id: null, max_use: null, expires_at: null, token_type: "api_key" });
  assert.deepEqual(JSON.parse(api.calls[1].init.body), { user_id: id, agent_id: null, max_use: null, expires_at: null, token_type: "api_key" });
});
test("partial edits, revocation and permanent deletion use distinct API operations", async () => {
  const api = client([{ body: { message: "updated" } }, { body: { message: "updated" } }, { body: { message: "deleted" } }]);
  await api.updateToken(id, { max_use: null, expires_at: null });
  await api.revokeToken(id);
  await api.deleteToken(id);
  assert.deepEqual(api.calls.map(call => call.init.method), ["PATCH", "PATCH", "DELETE"]);
  assert.deepEqual(JSON.parse(api.calls[0].init.body), { max_use: null, expires_at: null });
  assert.deepEqual(JSON.parse(api.calls[1].init.body), { is_revoked: true });
  assert.equal(api.calls[2].init.body, undefined);
});
test("validate makes exactly one consuming request and exposes reason for rejection", async () => {
  const api = client([{ body: { valid: true } }, { status: 403, body: { valid: false, error: "token expired" } }]);
  assert.equal((await api.validateToken(row.token)).valid, true);
  assert.equal(api.calls[0].url, "/api/tokens/validate");
  assert.equal(api.calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(api.calls[0].init.body), { token: row.token });
  await assert.rejects(api.validateToken(row.token), /หมดอายุ/);
  assert.equal(api.calls.length, 2);
});
test("proxy forwards only session authentication and preserves PATCH null fields", async () => {
  const api = proxy({ body: { message: "updated" } });
  const response = await api.invoke("PATCH", [id], { max_use: null, expires_at: null }, { origin: "https://dashboard.test", authorization: "Bearer ignored" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(api.calls[0].url, `https://backend.test/api/tokens/${id}`);
  assert.equal(api.calls[0].init.headers.cookie, "__Host-session=session-test");
  assert.equal(api.calls[0].init.headers.authorization, undefined);
  assert.equal(api.calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(api.calls[0].init.body), { max_use: null, expires_at: null });
});
test("proxy rejects unauthenticated, cross-site and unsupported detail reads", async () => {
  const anonymous = proxy({ session: null });
  assert.equal((await anonymous.invoke("POST", ["validate"], { token: row.token })).status, 401);
  assert.equal(anonymous.calls.length, 0);
  const api = proxy();
  assert.equal((await api.invoke("POST", [], {}, { origin: "https://external.test" })).status, 403);
  assert.equal((await api.invoke("GET", [id])).status, 405);
  assert.equal((await api.invoke("PATCH", ["validate"], {})).status, 405);
  assert.equal(api.calls.length, 0);
});
test("proxy preserves validation failures and strips SQL diagnostics from backend failures", async () => {
  const invalid = proxy({ status: 403, body: { valid: false, error: "token revoked" } });
  const response = await invalid.invoke("POST", ["validate"], { token: row.token });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { valid: false, error: "token revoked" });
  const failed = proxy({ status: 500, body: { error: "database failure", sql: "secret sql", args: [row.token], detail: "private" } });
  const payload = await (await failed.invoke("PATCH", [id], { max_use: 2 })).json();
  assert.deepEqual(Object.keys(payload), ["error"]);
  assert.equal(JSON.stringify(payload).includes("secret"), false);
  assert.equal((await proxy({ fail: true }).invoke("GET")).status, 502);
});
test("permission errors use users.manage and malformed success is not accepted", async () => {
  const api = client([{ status: 403, body: { error: "forbidden" } }, { body: { tokens: null } }, { body: { valid: false } }]);
  await assert.rejects(api.listTokens(), /users.manage/);
  await assert.rejects(api.listTokens(), /API/);
  await assert.rejects(api.validateToken(row.token), /API/);
});
