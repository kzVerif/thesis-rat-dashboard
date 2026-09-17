/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { protocol, id, harness, single, aggregate, envelope } = require("./power-test-helpers.cjs");

function clean(h, socket) {
  assert.equal(h.timers.size, 0);
  assert.equal(socket.readyState, 3);
  for (const key of ["onopen", "onmessage", "onerror", "onclose"]) assert.equal(socket[key], null);
}
test("single sends exact wire shape with a fresh hyphenated UUID, existing URL, then cleans up", async () => {
  const h = harness();
  let previous;
  for (let i = 0; i < 2; i++) {
    const pending = h.client.shutdownAgent(id(1));
    const socket = h.sockets[i];
    assert.equal(socket.sent.length, 0);
    assert.equal(socket.url, "wss://example.test/ws/frontend");
    socket.open();
    const request = socket.sent[0];
    assert.deepEqual(Object.keys(request).sort(), ["action", "agent_id", "request_id", "type"]);
    assert.equal(request.type, "power");
    assert.equal(request.action, "shutdown");
    assert.equal(request.agent_id, id(1));
    assert.match(request.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(request.request_id, previous);
    previous = request.request_id;
    socket.message(single(socket));
    assert.equal((await pending).mode, "mock");
    clean(h, socket);
  }
});
test("room sends ONE room request and resolves only the final room aggregate", async () => {
  const h = harness();
  const pending = h.client.shutdownRoom(id(2));
  const socket = h.sockets[0]; socket.open(); socket.onopen();
  assert.equal(socket.sent.length, 1);
  assert.deepEqual(Object.keys(socket.sent[0]).sort(), ["action", "request_id", "room_id", "type"]);
  assert.equal(socket.sent[0].action, "shutdown_room");
  assert.equal(socket.sent[0].room_id, id(2));
  socket.message(single(socket));
  assert.equal(socket.closed, 0);
  socket.message(aggregate(socket, { accepted: 5, failed: 2, timeout: 1 }));
  assert.equal((await pending).timeout, 1);
  clean(h, socket);
});
test("ignores other requests, targets, streams, actions, malformed and binary data", async () => {
  const h = harness();
  const pending = h.client.shutdownAgent(id(1));
  const socket = h.sockets[0]; socket.open();
  socket.message(single(socket, { request_id: id(99) }));
  socket.message(single(socket, { agent_id: id(99) }));
  socket.message(single(socket, { success: "true" }));
  socket.message(single(socket, { mode: null }));
  socket.message({ type: "agent_status", status: "offline", agent_id: id(1) });
  socket.message(envelope(socket, "forbidden", { stream: "process" }));
  socket.message(envelope(socket, "forbidden", { action: "shutdown_room" }));
  socket.message(envelope(socket, "forbidden", { request_id: id(99) }));
  socket.message(envelope(socket, "forbidden", { agent_id: id(99) }));
  socket.onmessage({ data: "{" });
  socket.onmessage({ data: new Uint8Array([0]) });
  assert.equal(socket.closed, 0);
  socket.message(single(socket));
  await pending;
  clean(h, socket);
});
for (const code of ["invalid_request", "forbidden", "authorization_unavailable", "agent_not_found", "agent_offline", "room_not_found", "lookup_failed", "duplicate_request", "new_server_code"]) {
  test("power error envelope: " + code, async () => {
    const h = harness();
    const pending = h.client.shutdownAgent(id(1));
    const rejection = assert.rejects(pending, error => error.code === code && error.message === protocol.getPowerErrorMessage(code));
    const socket = h.sockets[0]; socket.open();
    socket.message(envelope(socket, code));
    await rejection;
    clean(h, socket);
  });
}
for (const [code, expected] of [[undefined, "execution_failed"], ["timeout", "timeout"], ["send_failed", "send_failed"]]) {
  test("single execution failure: " + expected, async () => {
    const h = harness();
    const pending = h.client.shutdownAgent(id(1));
    const rejection = assert.rejects(pending, error => error.code === expected);
    const socket = h.sockets[0]; socket.open();
    socket.message(single(socket, { success: false, code, message: "failure" }));
    await rejection;
    clean(h, socket);
  });
}
test("room errors accept empty target fields; mismatched targets are ignored", async () => {
  const h = harness();
  const pending = h.client.shutdownRoom(id(2));
  const rejection = assert.rejects(pending, error => error.code === "room_not_found");
  const socket = h.sockets[0]; socket.open();
  socket.message(envelope(socket, "room_not_found", { room_id: id(99) }));
  assert.equal(socket.closed, 0);
  socket.message(envelope(socket, "room_not_found", { room_id: "" }));
  await rejection;
  clean(h, socket);
});
test("room validation rejects inconsistent counts, negatives and missing fields", async () => {
  const h = harness();
  const pending = h.client.shutdownRoom(id(2));
  const socket = h.sockets[0]; socket.open();
  for (const patch of [{ total: 3 }, { accepted: -1 }, { timeout: undefined }, { online: "8" }]) {
    socket.message(aggregate(socket, patch));
    assert.equal(socket.closed, 0);
  }
  socket.message(aggregate(socket, { total: 0, online: 0, offline: 0, accepted: 0 }));
  assert.equal((await pending).total, 0);
  clean(h, socket);
});
for (const opened of [false, true]) {
  test("15-second safety timer bounds " + (opened ? "response" : "connection") + " wait", async () => {
    const h = harness();
    const pending = h.client.shutdownAgent(id(1));
    const rejection = assert.rejects(pending, error => error.code === "communication_timeout");
    const socket = h.sockets[0];
    const connectingTimer = [...h.timers.keys()][0];
    if (opened) {
      socket.open();
      assert.equal(h.timers.has(connectingTimer), false);
    }
    assert.equal(h.timers.size, 1);
    assert.equal([...h.timers.values()][0].delay, 15000);
    h.fireTimer();
    await rejection;
    clean(h, socket);
    assert.equal(h.sockets.length, 1);
  });
}
for (const event of ["onerror", "onclose"]) {
  test(event + " releases pending operation without retry", async () => {
    const h = harness();
    const pending = h.client.shutdownRoom(id(2));
    const rejection = assert.rejects(pending, error => error.code.startsWith("connection_"));
    const socket = h.sockets[0]; socket.open();
    socket[event]();
    await rejection;
    clean(h, socket);
    assert.equal(h.sockets.length, 1);
  });
}
test("send exceptions clean up and report send_failed", async () => {
  const h = harness();
  const pending = h.client.shutdownAgent(id(1));
  const rejection = assert.rejects(pending, error => error.code === "send_failed");
  const socket = h.sockets[0];
  socket.send = () => { throw new Error("send"); };
  socket.open();
  await rejection;
  clean(h, socket);
});
test("abort releases handlers, timer, and signal listener; aborted input opens no socket", async () => {
  const h = harness();
  const controller = new AbortController();
  let removed = 0;
  const original = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.removeEventListener = (...args) => { removed++; original(...args); };
  const pending = h.client.shutdownAgent(id(1), { signal: controller.signal });
  const rejection = assert.rejects(pending, error => error.code === "cancelled");
  controller.abort();
  await rejection;
  clean(h, h.sockets[0]);
  assert.equal(removed, 1);
  await assert.rejects(h.client.shutdownRoom(id(2), { signal: controller.signal }));
  assert.equal(h.sockets.length, 1);
});
test("invalid target IDs are rejected before any socket; fallback URL matches existing clients", async () => {
  const h = harness({});
  await assert.rejects(h.client.shutdownAgent("invalid"), error => error.code === "invalid_request");
  await assert.rejects(h.client.shutdownRoom("invalid"), error => error.code === "invalid_request");
  assert.equal(h.sockets.length, 0);
  const pending = h.client.shutdownAgent(id(1));
  const socket = h.sockets[0];
  assert.equal(socket.url, "ws://localhost:8081/ws/frontend");
  socket.open(); socket.message(single(socket)); await pending;
});
test("socket constructor failures reject without leaked timers", async () => {
  const { load } = require("./power-test-helpers.cjs");
  const h = harness();
  const client = load("lib/power-control-client.ts", { "./power-control": protocol }, {
    crypto: require("node:crypto"), process: { env: {} }, clearTimeout,
    WebSocket: class { constructor() { throw new Error("invalid URL"); } },
  });
  await assert.rejects(client.shutdownAgent(id(1)), error => error.code === "connection_error");
  assert.equal(h.timers.size, 0);
});
test("unknown codes always use a safe generic message, even inherited object property names", () => {
  for (const code of ["unknown", "constructor", "__proto__"]) {
    assert.equal(protocol.getPowerErrorMessage(code), "เกิดข้อผิดพลาดในการส่งคำสั่ง");
  }
});
