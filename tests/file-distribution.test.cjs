/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load, id } = require("./power-test-helpers.cjs");
const protocol = load("lib/file-distribution.ts", {}, { TextEncoder });
const request = (destinationPath) => ({ fileId: id(1), filename: "lesson.zip", fileSize: 100,
  targetLabel: "Lab", destinationPath, target: { type: "AGENTS", agent_ids: [id(2), id(2)] }, computers: [] });

test("destination paths preserve spaces and Unicode, with a byte limit", () => {
  for (const path of ["", "D:\\Shared Files\\Lessons", "/srv/shared", "/srv/บทเรียน", "C:/Lessons", "/" , "/" + "a".repeat(4095)]) {
    assert.equal(protocol.validateDestinationPath(path), null, path);
  }
  for (const path of ["relative/path", "D:folder", "\\\\server\\share", "//server/share", "\\\\?\\C:\\data", "/srv/../data", "C:\\data\\.\\test", "/bad\npath", "/" + "ก".repeat(1366)]) {
    assert.ok(protocol.validateDestinationPath(path), path);
  }
});

test("wire payload includes the exact folder for both target types and deduplicates agents", () => {
  const path = "D:\\Shared Files\\Lessons ";
  const agents = JSON.parse(protocol.createDistributionPayload(request(path), id(3)));
  assert.deepEqual(agents, { type: "FILE_DISTRIBUTE", request_id: id(3), file_id: id(1), destination_path: path,
    target: { type: "AGENTS", agent_ids: [id(2)] } });
  const room = JSON.parse(protocol.createDistributionPayload({ ...request("/srv/shared"), target: { type: "ROOM", room_id: id(4) } }, id(3)));
  assert.equal(room.destination_path, "/srv/shared");
  assert.equal(room.target.room_id, id(4));
  assert.equal("destination_path" in JSON.parse(protocol.createDistributionPayload(request(""), id(3))), false);
  assert.throws(() => protocol.createDistributionPayload(request("../data"), id(3)));
  assert.throws(() => protocol.createDistributionPayload({ ...request(), fileId: "bad" }, id(3)));
});

const update = (patch = {}) => ({ type: "FILE_DISTRIBUTION_TARGET_UPDATE", job_id: id(5), agent_id: id(2), status: "DOWNLOADING", progress: 72, downloaded_bytes: 72, total_bytes: 100, ...patch });
const job = () => ({ id: id(5), status: "IN_PROGRESS", totalTargets: 2, agents: {}, fileSize: 100 });

test("target snapshots replace bytes/progress and do not complete a partial target set", () => {
  let state = protocol.applyDistributionUpdate(job(), update());
  state = protocol.applyDistributionUpdate(state, update());
  assert.equal(state.agents[id(2)].downloadedBytes, 72);
  state = protocol.applyDistributionUpdate(state, update({ status: "COMPLETED", progress: 100 }));
  assert.equal(state.status, "IN_PROGRESS");
  state = protocol.applyDistributionUpdate(state, update({ agent_id: id(6), status: "FAILED" }));
  assert.equal(state.status, "PARTIAL_FAILED");
  assert.equal(state.completedTargets, 1);
  assert.equal(state.failedTargets, 1);
  assert.equal(protocol.deriveJobStatus([]), "FAILED");
});

test("CREATED offline counts allow final status without inventing offline agent rows", () => {
  const state = protocol.applyDistributionUpdate({ ...job(), offlineTargets: 1 }, update({ status: "COMPLETED", progress: 100 }));
  assert.equal(state.status, "PARTIAL_FAILED");
  assert.equal(state.completedTargets, 1);
  assert.equal(state.offlineTargets, 1);
  assert.equal(Object.keys(state.agents).length, 1);
});

function harness() {
  let cursor = 0;
  const slots = [], effects = [], sockets = [], timers = new Map(), notices = [];
  let serial = 0;
  const react = {
    createContext: () => ({}),
    useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useEffect: (callback, deps) => {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; });
      }
    },
  };
  class Socket {
    static OPEN = 1;
    constructor() { this.readyState = 0; this.handlers = {}; this.sent = []; sockets.push(this); }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    open() { this.readyState = 1; this.handlers.open(); }
    send(payload) { this.sent.push(payload); }
    message(data) { this.handlers.message({ data: JSON.stringify(data) }); }
    close() { this.readyState = 3; this.handlers.close?.(); }
  }
  const provider = load("components/file-distribution/file-distribution-provider.tsx", {
    react,
    "@/lib/file-distribution": protocol,
    "@/actions/file-distributions": { revalidateFileDistributionAction: async () => {} },
    sonner: { toast: { success: (...args) => notices.push(args), error: (...args) => notices.push(args) } },
  }, {
    WebSocket: Socket, crypto: require("node:crypto"), console: { debug: () => {} },
    process: { env: { NEXT_PUBLIC_FRONTEND_WS_URL: "wss://example.test/ws/frontend" } },
    window: { setTimeout: (callback, delay) => { const key = ++serial; timers.set(key, { callback, delay }); return key; }, clearTimeout: (key) => timers.delete(key) },
  });
  const render = () => { cursor = 0; const result = provider.FileDistributionProvider({ children: null }).props.value; effects.splice(0).forEach((run) => run()); return result; };
  render().retain(); render(); sockets[0].open();
  const fire = () => { const [key, timer] = timers.entries().next().value; timers.delete(key); timer.callback(); };
  return { render, sockets, timers, fire, notices };
}

const created = (patch = {}) => ({ type: "FILE_DISTRIBUTION_CREATED", job_id: id(5), file_id: id(1), total_targets: 2, online_targets: 2, offline_targets: 0, status: "IN_PROGRESS", ...patch });

test("lost response reconnects and sends the identical request; another action gets a fresh ID", () => {
  const h = harness();
  const firstId = h.render().distribute(request("/srv/first"));
  const payload = h.sockets[0].sent[0];
  assert.throws(() => h.render().distribute(request("/srv/second")));
  assert.equal(h.render().pending, true);
  h.fire(); // Response timeout closes the connection.
  h.fire(); // Reconnect delay.
  h.sockets[1].open();
  assert.equal(h.sockets[1].sent[0], payload);
  h.sockets[1].message(created());
  assert.equal(h.render().pending, false);
  assert.equal(h.timers.size, 0);
  assert.notEqual(h.render().distribute(request("/srv/second")), firstId);
  assert.equal(JSON.parse(h.sockets[1].sent[1]).destination_path, "/srv/second");
});

test("early updates survive CREATED and room membership is not guessed from selection data", () => {
  const h = harness();
  h.render().distribute({ ...request(), computers: [{ id: id(99), hostname: "stale", status: "ONLINE" }] });
  h.sockets[0].message(update());
  h.sockets[0].message(update({ progress: 90, downloaded_bytes: 90 }));
  h.sockets[0].message(created());
  const state = h.render().jobs[id(5)];
  assert.equal(state.agents[id(2)].progress, 90);
  assert.equal(state.agents[id(99)], undefined);
  assert.equal(state.totalTargets, 2);
});

test("session rejection releases pending request, stops reconnecting, and uses a user message", () => {
  const h = harness();
  h.render().distribute(request());
  h.sockets[0].message({ type: "error", error: "ขาดการ login" });
  assert.equal(h.render().pending, false);
  assert.equal(h.render().connection, "disconnected");
  assert.equal(h.timers.size, 0);
  assert.notEqual(h.notices[0][1].description, "ขาดการ login");
});
