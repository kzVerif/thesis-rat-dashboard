/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { load, id } = require("./power-test-helpers.cjs");

function harness() {
  const timers = new Map(); let next = 0;
  const feature = load("lib/installed-apps.ts", {}, {
    crypto: { randomUUID },
    setTimeout: (fn, delay) => { const key = ++next; timers.set(key, { fn, delay }); return key; },
    clearTimeout: key => timers.delete(key),
  });
  class Socket {
    readyState = 1; sent = []; listeners = new Map();
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    send(data) { this.sent.push(JSON.parse(data)); }
    message(value) { for (const fn of this.listeners.get("message") ?? []) fn({ data: typeof value === "string" ? value : JSON.stringify(value) }); }
    close() { this.readyState = 3; for (const fn of this.listeners.get("close") ?? []) fn(); }
  }
  const socket = new Socket(); const events = [];
  const controller = new feature.InstalledAppsController(socket, id(1), event => events.push(event));
  const reply = (patch = {}) => ({ type: "installed_apps", action: "result", agent_id: id(1), request_id: socket.sent.at(-1)?.request_id, success: true, apps: [{ name: "App", version: "1" }], ...patch });
  return { feature, socket, controller, events, timers, reply, expire: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(t => t.fn()); } };
}

test("inventory uses supplied socket, exact request, pending guard and fresh refresh UUID", () => {
  const h = harness(); h.controller.request(); h.controller.request();
  assert.equal(h.socket.sent.length, 1);
  const first = h.socket.sent[0];
  assert.deepEqual(Object.keys(first).sort(), ["type", "action", "agent_id", "request_id"].sort());
  assert.equal(first.type, "installed_apps"); assert.equal(first.action, "get"); assert.equal(first.agent_id, id(1));
  assert.match(first.request_id, /^[0-9a-f-]{36}$/);
  assert.equal([...h.timers.values()][0].delay, 17000);
  h.socket.message(h.reply()); assert.equal(h.events.at(-1).type, "ready"); assert.equal(h.timers.size, 0);
  h.controller.request(); assert.equal(h.socket.sent.length, 2); assert.notEqual(h.socket.sent[1].request_id, first.request_id);
  h.controller.dispose(); assert.equal(h.timers.size, 0); assert.equal(h.socket.readyState, 1);
});
test("ignores unrelated, old, malformed and invalid inventory responses", () => {
  const h = harness(); h.controller.request();
  for (const patch of [
    { type: "performance" }, { action: "get" }, { agent_id: id(2) }, { request_id: id(9) },
    { success: "true" }, { apps: null }, { apps: [{ name: "" }] },
    { apps: [{ name: "A", estimated_size_kb: -1 }] }, { apps: [{ name: "A", version: 5 }] },
    { apps: Array.from({ length: 2001 }, () => ({ name: "A" })) },
  ]) h.socket.message(h.reply(patch));
  h.socket.message("{"); h.socket.message("null");
  assert.equal(h.events.length, 1); assert.equal(h.timers.size, 1);
  h.socket.message(h.reply({ apps: [] })); assert.equal(h.events.at(-1).type, "ready");
  h.socket.message(h.reply()); assert.equal(h.events.length, 2);
  h.controller.dispose();
});
test("timeout clears pending and late results cannot replace a new request", () => {
  const h = harness(); h.controller.request(); const old = h.reply();
  h.expire(); assert.equal(h.events.at(-1).type, "timeout");
  h.controller.request(); h.socket.message(old); assert.equal(h.events.at(-1).type, "loading");
  h.socket.message(h.reply()); assert.equal(h.events.at(-1).type, "ready"); h.controller.dispose();
});
test("failures are scoped, show safe text and retain previous successful data", () => {
  const h = harness(); let state = h.feature.initialInstalledAppsState;
  state = h.feature.installedAppsReducer(state, { type: "ready", apps: [{ name: "Saved" }], at: "2026-09-29T00:00:00Z" });
  h.controller.request(); h.socket.message(h.reply({ success: false, code: "forbidden", error: "private database error" }));
  const event = h.events.at(-1); assert.equal(event.type, "error"); assert.ok(!event.error.includes("private"));
  state = h.feature.installedAppsReducer(state, { type: "loading" }); assert.equal(state.status, "refreshing");
  for (const e of [event, { type: "offline" }, { type: "timeout", error: "timeout" }]) {
    state = h.feature.installedAppsReducer(state, e); assert.equal(state.apps[0].name, "Saved"); assert.ok(state.updatedAt);
  }
  h.controller.dispose();
});
test("offline, disposal, reconnect and agent switch remove timers/listeners without closing shared socket", () => {
  const h = harness(); h.controller.request(); const old = h.reply(); h.socket.close();
  assert.equal(h.events.at(-1).type, "offline"); assert.equal(h.timers.size, 0);
  h.controller.request(); assert.equal(h.socket.sent.length, 1); h.controller.dispose();
  for (const set of h.socket.listeners.values()) assert.equal(set.size, 0);
  h.socket.readyState = 1;
  const events = []; const second = new h.feature.InstalledAppsController(h.socket, id(2), e => events.push(e)); second.request();
  h.socket.message(old); assert.equal(events.length, 1);
  h.socket.message(h.reply({ agent_id: id(2) })); assert.equal(events.at(-1).type, "ready"); second.dispose();
  assert.equal(h.socket.readyState, 1); assert.equal(h.timers.size, 0);
});
test("send errors do not leave a pending request", () => {
  const h = harness(); h.socket.send = () => { throw new Error("closed"); }; h.controller.request();
  assert.equal(h.events.at(-1).type, "error"); assert.equal(h.timers.size, 0); h.controller.dispose();
});
test("search is derived, case-insensitive and never sends requests", () => {
  const h = harness(); const apps = [{ name: "Editor", version: "V2", publisher: "Acme" }, { name: "Browser" }];
  for (const q of [" EDITOR ", "v2", "ACME"]) assert.equal(h.feature.filterInstalledApps(apps, q).length, 1);
  assert.equal(h.feature.filterInstalledApps(apps, "missing").length, 0);
  assert.equal(h.feature.filterInstalledApps(apps, ""), apps); assert.equal(apps.length, 2); assert.equal(h.socket.sent.length, 0); h.controller.dispose();
});
test("registry dates and KB sizes handle unknowns and calendar boundaries", () => {
  const { feature: f, controller } = harness();
  assert.equal(f.formatInstallDate("20240229"), "2024-02-29");
  for (const value of [undefined, "", "garbage", "20260229", "20260230", "20261301", "20260000", "00000101"]) assert.equal(f.formatInstallDate(value), "—");
  assert.equal(f.formatInstalledSize(), "—"); assert.equal(f.formatInstalledSize(-1), "—"); assert.equal(f.formatInstalledSize(0), "0 KB");
  assert.equal(f.formatInstalledSize(2048), "2.0 MB"); assert.equal(f.formatInstalledSize(1048576), "1.0 GB"); controller.dispose();
});
test("independent dashboards never resolve one another's request", () => {
  const a = harness(), b = harness(); a.controller.request(); b.controller.request();
  a.socket.message(b.reply()); b.socket.message(a.reply()); assert.equal(a.events.length, 1); assert.equal(b.events.length, 1);
  a.socket.message(a.reply()); b.socket.message(b.reply()); assert.equal(a.events.at(-1).type, "ready"); assert.equal(b.events.at(-1).type, "ready");
  a.controller.dispose(); b.controller.dispose();
});
