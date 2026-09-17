/* eslint-disable @typescript-eslint/no-require-imports -- Match the repository's isolated Node/TypeScript harness. */
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");

function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), Error, AbortController, ...globals });
  return exports;
}
const protocol = load("lib/power-control.ts");
const id = n => "11111111-1111-4111-8111-" + String(n).padStart(12, "0");
const agent = { id: id(1), hostname: "LAB-PC-07", room_id: id(2), ip_address: "192.168.1.20", status: "ONLINE", os_info: null, last_seen: null };
const room = { id: id(2), name: "LAB-101", description: null, agent_count: 10, online_agent_count: 8, offline_agent_count: 2, updated_at: "2026-09-18T00:00:00Z" };
function harness(env = { NEXT_PUBLIC_FRONTEND_WS_URL: "wss://example.test/ws/frontend" }) {
  const timers = new Map();
  const sockets = [];
  let serial = 0;
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closed = 0; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.(); }
    send(payload) { this.sent.push(JSON.parse(payload)); }
    message(payload) { this.onmessage?.({ data: JSON.stringify(payload) }); }
    close() { this.readyState = 3; this.closed++; this.onclose?.(); }
  }
  const globals = {
    WebSocket: Socket, crypto: { randomUUID }, process: { env },
    setTimeout: (callback, delay) => { const key = ++serial; timers.set(key, { callback, delay }); return key; },
    clearTimeout: key => timers.delete(key),
  };
  const client = load("lib/power-control-client.ts", { "./power-control": protocol }, globals);
  const fireTimer = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()); };
  return { client, timers, sockets, fireTimer };
}
function single(socket, patch = {}) {
  return { type: "power", action: "shutdown_result", request_id: socket.sent[0].request_id, agent_id: id(1), success: true, mode: "mock", message: "shutdown command accepted", ...patch };
}
function aggregate(socket, patch = {}) {
  return { type: "power", action: "shutdown_room_result", request_id: socket.sent[0].request_id, room_id: id(2), total: 10, online: 8, offline: 2, accepted: 8, failed: 0, timeout: 0, ...patch };
}
function envelope(socket, code, patch = {}) {
  const request = socket.sent[0];
  return { type: "error", stream: "power", action: request.action, request_id: request.request_id, agent_id: request.agent_id ?? "", room_id: request.room_id ?? "", code, error: "internal backend message", ...patch };
}

// Exercise actual component event handlers and the actual command hook without adding a DOM framework.
// Primitive UI widgets are leaves; DOM, focus management, and browser cookie transport need E2E checks.
function ui(file, props, h, extraImports = {}) {
  let cursor = 0;
  const state = [];
  const cleanups = [];
  const effects = new Set();
  const notifications = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!effects.has(index)) { effects.add(index); const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
    },
    useMemo: fn => fn(),
    useTransition: () => [false, fn => fn()],
  };
  const toast = Object.fromEntries(["success", "warning", "error", "info"].map(kind => [kind, (...args) => notifications.push({ kind, args })]));
  const imports = {
    react,
    sonner: { toast },
    "@/lib/power-control": protocol,
    "@/lib/power-control-client": h.client,
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/input": { Input: "input" },
    "@/components/ui/label": { Label: "label" },
    "@/components/ui/dialog": Object.fromEntries(["Dialog", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle"].map(name => [name, name])),
    "@hugeicons/react": { HugeiconsIcon: "icon" },
    "@hugeicons/core-free-icons": {},
    "next/link": { __esModule: true, default: "a" },
    ...extraImports,
  };
  imports["@/hooks/use-power-command"] = load("hooks/use-power-command.ts", imports);
  const Component = load(file, imports).default;
  function expand(element) {
    if (Array.isArray(element)) return element.map(expand);
    if (!element || typeof element !== "object") return element;
    if (typeof element.type === "function") return expand(element.type(element.props));
    return { ...element, props: { ...element.props, children: expand(element.props.children) } };
  }
  function render() { cursor = 0; return expand(Component(props)); }
  return { render, notifications, unmount: () => cleanups.forEach(fn => fn()) };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return text(tree.props.children);
}
function button(tree, label) { return nodes(tree).find(node => node.type === "button" && text(node) === label); }

module.exports = { load, protocol, id, agent, room, harness, single, aggregate, envelope, ui, nodes, text, button };
