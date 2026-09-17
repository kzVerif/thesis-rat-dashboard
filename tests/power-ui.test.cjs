/* eslint-disable @typescript-eslint/no-require-imports -- Node component event harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { protocol, agent, room, harness, single, aggregate, envelope, ui, nodes, text, button } = require("./power-test-helpers.cjs");
const agentDialog = "app/(system)/agents/_components/ShutdownAgentDialog.tsx";
const roomDialog = "app/(system)/rooms/_components/ShutdownRoomDialog.tsx";
function agentUI(h, onOpenChange = () => {}) { return ui(agentDialog, { agent, roomName: room.name, onOpenChange }, h); }
function roomUI(h, onOpenChange = () => {}) { return ui(roomDialog, { room, onOpenChange }, h); }

for (const status of ["ONLINE", "OFFLINE", "WARNING", "DISABLED"]) {
  test("Agent Management shutdown button reflects " + status + " and preserves existing actions", () => {
    const h = harness();
    const view = ui("app/(system)/agents/_components/AgentManagement.tsx", {
      initialAgents: [{ ...agent, status }], rooms: [room], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
    }, h, {
      "@/actions/agents": {},
      "./ShutdownAgentDialog": { __esModule: true, default: "ShutdownAgentDialog" },
    });
    const tree = view.render();
    const shutdown = nodes(tree).filter(node => node.type === "button" && text(node) === "ปิดเครื่อง");
    assert.equal(shutdown.length, 2); // Desktop and mobile controls.
    for (const control of shutdown) assert.equal(control.props.disabled, status !== "ONLINE");
    assert.ok(button(tree, "แก้ไข"));
    assert.ok(button(tree, "ลบ"));
    assert.ok(text(tree).includes("รายละเอียด"));
    assert.equal(h.sockets.length, 0);
    if (status === "ONLINE") {
      shutdown[0].props.onClick();
      assert.ok(nodes(view.render()).some(node => node.type === "ShutdownAgentDialog"));
      assert.equal(h.sockets.length, 0);
    }
  });
}
test("cancel Agent and Room dialogs sends no WebSocket request", () => {
  for (const create of [agentUI, roomUI]) {
    const h = harness();
    const changes = [];
    const view = create(h, value => changes.push(value));
    button(view.render(), "ยกเลิก").props.onClick();
    assert.deepEqual(changes, [false]);
    assert.equal(h.sockets.length, 0);
    view.unmount();
  }
});
test("Agent confirmation sends exact request, prevents double click, locks dismissal, and shows mock success", async () => {
  const h = harness();
  const changes = [];
  const view = agentUI(h, value => changes.push(value));
  const click = button(view.render(), "ส่งคำสั่งปิดเครื่อง").props.onClick;
  const pending = click();
  await click();
  assert.equal(h.sockets.length, 1);
  let tree = view.render();
  assert.ok(button(tree, "กำลังดำเนินการ...").props.disabled);
  assert.ok(button(tree, "ยกเลิก").props.disabled);
  nodes(tree).find(node => node.type === "Dialog").props.onOpenChange(false);
  assert.equal(changes.length, 0);
  assert.match(text(tree), /กำลังเชื่อมต่อ/);
  const socket = h.sockets[0]; socket.open();
  assert.match(text(view.render()), /กำลังรอผลคำสั่ง/);
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.sent[0].action, "shutdown");
  assert.equal(socket.sent[0].agent_id, agent.id);
  socket.message(single(socket)); await pending;
  tree = view.render();
  assert.match(text(tree), /Agent ยอมรับคำสั่งแล้ว \(Mock\)/);
  assert.match(text(tree), /เครื่องจะยังไม่ถูกปิดจริง/);
  assert.doesNotMatch(text(tree), /เครื่องถูกปิดสำเร็จ/);
  assert.equal(view.notifications[0].kind, "success");
  assert.match(view.notifications[0].args[0], /ทดสอบ/);
  assert.equal(button(tree, "ส่งคำสั่งปิดเครื่อง"), undefined);
  assert.ok(button(tree, "ปิด"));
  assert.equal(agent.status, "ONLINE");
  assert.equal(h.timers.size, 0);
  view.unmount();
});
for (const code of ["execution_failed", "timeout", "send_failed", "agent_offline", "forbidden"]) {
  test("Agent UI displays " + code + " and exits loading", async () => {
    const h = harness(); const view = agentUI(h);
    const pending = button(view.render(), "ส่งคำสั่งปิดเครื่อง").props.onClick();
    const socket = h.sockets[0]; socket.open();
    if (["execution_failed", "timeout", "send_failed"].includes(code)) {
      socket.message(single(socket, { success: false, code: code === "execution_failed" ? undefined : code, message: "failed" }));
    } else socket.message(envelope(socket, code));
    await pending;
    const tree = view.render();
    assert.ok(text(tree).includes(protocol.getPowerErrorMessage(code)));
    assert.equal(button(tree, "ส่งคำสั่งปิดเครื่อง").props.disabled, false);
    assert.equal(view.notifications[0].kind, "error");
    assert.equal(view.notifications.some(note => note.kind === "success"), false);
    view.unmount();
  });
}
for (const status of ["OFFLINE", "WARNING", "DISABLED"]) {
  test("Agent dialog guards stale or disabled target: " + status, async () => {
    const h = harness();
    const view = ui(agentDialog, { agent: { ...agent, status }, roomName: room.name, onOpenChange() {} }, h);
    const control = button(view.render(), "ส่งคำสั่งปิดเครื่อง");
    assert.equal(control.props.disabled, true);
    await control.props.onClick();
    assert.equal(h.sockets.length, 0);
  });
}
test("RoomCard disables shutdown with zero online, even when total is positive; counts remain visible", () => {
  const h = harness();
  const view = ui("app/(system)/rooms/_components/RoomCard.tsx", {
    room: { ...room, online_agent_count: 0, offline_agent_count: 10 }, onEdit() {}, onDelete() {}, onShutdown() {},
  }, h);
  const tree = view.render();
  assert.equal(button(tree, "ปิดเครื่องทั้งหมดในห้อง").props.disabled, true);
  assert.match(text(tree), /10ทั้งหมด0ออนไลน์10ออฟไลน์/);
  assert.ok(button(tree, "แก้ไข")); assert.ok(button(tree, "ลบ"));
});
test("Room dialog refuses zero-online confirmation even if invoked directly", async () => {
  const h = harness();
  const view = ui(roomDialog, { room: { ...room, online_agent_count: 0 }, onOpenChange() {} }, h);
  const control = button(view.render(), "ยืนยันปิดเครื่องทั้งหมด");
  assert.equal(control.props.disabled, true);
  await control.props.onClick();
  assert.equal(h.sockets.length, 0);
});
for (const [label, patch, tone] of [
  ["all online accepted", {}, "success"],
  ["mixed accepted failed offline timeout", { accepted: 5, failed: 2, timeout: 1 }, "warning"],
  ["all failed", { accepted: 0, failed: 8 }, "warning"],
  ["zero agents at dispatch", { total: 0, online: 0, offline: 0, accepted: 0 }, "info"],
  ["all offline at dispatch", { online: 0, offline: 10, accepted: 0 }, "info"],
]) {
  test("Room renders authoritative aggregate: " + label, async () => {
    const h = harness(); const view = roomUI(h);
    assert.match(text(view.render()), /Agents ทั้งหมด10 เครื่องออนไลน์8 เครื่องออฟไลน์2 เครื่อง/);
    const click = button(view.render(), "ยืนยันปิดเครื่องทั้งหมด").props.onClick;
    const pending = click(); await click();
    assert.equal(h.sockets.length, 1);
    assert.equal(button(view.render(), "กำลังดำเนินการ...").props.disabled, true);
    const socket = h.sockets[0]; socket.open();
    assert.equal(socket.sent.length, 1);
    assert.equal(socket.sent[0].action, "shutdown_room");
    assert.equal(socket.sent[0].agent_id, undefined);
    const result = aggregate(socket, patch);
    socket.message(result); await pending;
    const tree = view.render();
    for (const [label, key] of [["Agents ทั้งหมด", "total"], ["ออนไลน์", "online"], ["ออฟไลน์", "offline"], ["ยอมรับคำสั่ง", "accepted"], ["ล้มเหลว", "failed"], ["หมดเวลา", "timeout"]]) {
      assert.ok(text(tree).includes(label + result[key] + " เครื่อง"));
    }
    assert.equal(view.notifications[0].kind, tone);
    assert.ok(button(tree, "ปิด"));
    assert.equal(button(tree, "ยืนยันปิดเครื่องทั้งหมด"), undefined);
    if (tone !== "success") assert.doesNotMatch(text(tree), /ออนไลน์ทั้งหมด ยอมรับคำสั่งแล้ว/);
    assert.equal(h.timers.size, 0);
    view.unmount();
  });
}
test("Room error envelope is shown and permits explicit retry with a new request", async () => {
  const h = harness(); const view = roomUI(h);
  const pending = button(view.render(), "ยืนยันปิดเครื่องทั้งหมด").props.onClick();
  let socket = h.sockets[0]; socket.open();
  const oldId = socket.sent[0].request_id;
  socket.message(envelope(socket, "room_not_found")); await pending;
  assert.ok(text(view.render()).includes(protocol.getPowerErrorMessage("room_not_found")));
  const retry = button(view.render(), "ยืนยันปิดเครื่องทั้งหมด").props.onClick();
  socket = h.sockets[1]; socket.open();
  assert.notEqual(socket.sent[0].request_id, oldId);
  socket.message(aggregate(socket)); await retry;
  view.unmount();
});
for (const cause of ["onclose", "onerror", "timer"]) {
  test("UI exits pending on communication failure: " + cause, async () => {
    const h = harness(); const view = agentUI(h);
    const pending = button(view.render(), "ส่งคำสั่งปิดเครื่อง").props.onClick();
    if (cause === "timer") h.fireTimer(); else h.sockets[0][cause]();
    await pending;
    assert.equal(button(view.render(), "ส่งคำสั่งปิดเครื่อง").props.disabled, false);
    assert.equal(view.notifications[0].kind, "error");
    assert.equal(h.timers.size, 0);
  });
}
test("unmount aborts pending command without late toasts, event handlers, or timers", async () => {
  const h = harness(); const view = roomUI(h);
  const pending = button(view.render(), "ยืนยันปิดเครื่องทั้งหมด").props.onClick();
  h.sockets[0].open();
  view.unmount();
  await pending;
  assert.equal(h.sockets[0].readyState, 3);
  assert.equal(h.sockets[0].onmessage, null);
  assert.equal(h.timers.size, 0);
  assert.equal(view.notifications.length, 0);
});

test("Agent Management edit/delete still call existing server actions and keep detail links", async () => {
  const h = harness(); const calls = [];
  const view = ui("app/(system)/agents/_components/AgentManagement.tsx", {
    initialAgents: [agent], rooms: [room], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
  }, h, {
    "@/actions/agents": {
      updateAgentAction: async (id, payload) => { calls.push(["edit", id, payload]); return { ok: true, data: { ...agent, hostname: "RENAMED" } }; },
      deleteAgentAction: async id => { calls.push(["delete", id]); return { ok: true }; },
    },
    "./ShutdownAgentDialog": { __esModule: true, default: "ShutdownAgentDialog" },
  });
  let tree = view.render();
  assert.ok(nodes(tree).some(node => node.type === "a" && node.props.href === "/agents/" + agent.id));
  button(tree, "แก้ไข").props.onClick();
  tree = view.render();
  nodes(tree).find(node => node.type === "form" && node.props.onSubmit).props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(calls[0][0], "edit");
  assert.equal(calls[0][1], agent.id);
  tree = view.render();
  assert.match(text(tree), /RENAMED/);
  button(tree, "ลบ").props.onClick();
  button(view.render(), "ยืนยันลบ").props.onClick();
  await new Promise(setImmediate);
  assert.equal(calls[1][0], "delete");
  assert.match(text(view.render()), /ไม่พบ Agent/);
  assert.equal(h.sockets.length, 0);
});
test("Room Management retains CRUD and mounts shutdown only after selecting its card", async () => {
  const h = harness(); const calls = [];
  const view = ui("app/(system)/rooms/_components/RoomManagement.tsx", { initialRooms: [room] }, h, {
    "@/actions/rooms": {
      createRoomAction: async input => { calls.push(["create", input]); return { ok: true, data: { ...room, id: "new-room", name: input.name } }; },
      updateRoomAction: async input => { calls.push(["edit", input]); return { ok: true, data: { ...room, name: input.name } }; },
      deleteRoomAction: async id => { calls.push(["delete", id]); return { ok: true }; },
    },
    "./RoomCard": { __esModule: true, default: "RoomCard" },
    "./RoomFormDialog": { __esModule: true, default: "RoomFormDialog" },
    "./DeleteRoomDialog": { __esModule: true, default: "DeleteRoomDialog" },
    "./ShutdownRoomDialog": { __esModule: true, default: "ShutdownRoomDialog" },
  });
  const find = type => nodes(view.render()).find(node => node.type === type);
  assert.equal(find("ShutdownRoomDialog"), undefined);
  find("RoomCard").props.onShutdown(room);
  assert.equal(find("ShutdownRoomDialog").props.room.id, room.id);
  find("ShutdownRoomDialog").props.onOpenChange(false);
  find("RoomCard").props.onEdit(room);
  const edit = nodes(view.render()).find(node => node.type === "RoomFormDialog" && node.props.initialRoom);
  await edit.props.onSubmit("RENAMED ROOM", "");
  assert.equal(find("RoomCard").props.room.name, "RENAMED ROOM");
  button(view.render(), "เพิ่มห้อง").props.onClick();
  await find("RoomFormDialog").props.onSubmit("NEW ROOM", "");
  assert.equal(nodes(view.render()).filter(node => node.type === "RoomCard").length, 2);
  find("RoomCard").props.onDelete(room);
  await find("DeleteRoomDialog").props.onConfirm();
  assert.equal(nodes(view.render()).filter(node => node.type === "RoomCard").length, 1);
  assert.deepEqual(calls.map(call => call[0]), ["edit", "create", "delete"]);
  assert.equal(h.sockets.length, 0);
});
