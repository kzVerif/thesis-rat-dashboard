# Next.js Agents List WebSocket

ดึงรายการ agent ทั้งหมด (ทั้งที่ออนไลน์และออฟไลน์) แบบเรียลไทม์ ใช้ WebSocket endpoint เดียวกับ performance / process:

```text
ws://localhost:8081/ws/frontend
```

ต้อง login ก่อน (cookie `__Host-session`) เช่นเดียวกับ stream อื่น ๆ หาก session หมดอายุ server จะปิด connection

## ขอรายการทั้งหมด (snapshot)

หลัง connect แล้วส่งคำขอครั้งเดียว:

```json
{
  "type": "agents",
  "action": "list"
}
```

> `action` ใส่ `"list"` หรือ `"subscribe"` ก็ได้ และจะละไว้ก็ได้ (ค่าเริ่มต้นเทียบเท่า `list`) ไม่ว่ากรณีใด connection นี้จะได้รับ `agent_update` แบบเรียลไทม์โดยอัตโนมัติอยู่แล้ว — ไม่ต้องส่งคำสั่ง subscribe แยก

Server ตอบกลับด้วย snapshot ของทุกเครื่อง:

```json
{
  "type": "agents",
  "action": "snapshot",
  "data": [
    {
      "id": "86dbfbcc-a13c-4ffc-adab-7187018273e0",
      "hostname": "lab-pc-01",
      "room_id": "44444444-4444-4444-8444-444444444444",
      "room_name": "ห้องปฏิบัติการ 1",
      "os_info": { "name": "Windows", "edition": "11 Home", "version": "26200" },
      "ip_address": "10.0.0.5",
      "mac_address": "aa:bb:cc:dd:ee:ff",
      "status": "ONLINE",
      "last_seen": "2026-10-08T10:00:00Z"
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "hostname": "lab-pc-02",
      "room_name": "",
      "os_info": { "name": "Windows", "edition": "10 Pro", "version": "19045" },
      "ip_address": "10.0.0.6",
      "mac_address": "11:22:33:44:55:66",
      "status": "OFFLINE",
      "last_seen": "2026-10-08T09:12:30Z"
    }
  ]
}
```

### ความหมายของแต่ละฟิลด์ (ตามคอลัมน์ที่ต้องแสดง)

| ฟิลด์ใน JSON | คอลัมน์ที่แสดง | หมายเหตุ |
| --- | --- | --- |
| `hostname` | ชื่อเครื่อง | |
| `room_name` | ห้อง | ว่าง (`""`) ถ้าเครื่องยังไม่ถูกจัดเข้าห้อง ใช้ `room_id` อ้างอิงได้ |
| `mac_address` | หมายเลข MAC | |
| `ip_address` | หมายเลข IP | |
| `os_info` | ระบบปฏิบัติการ | object `{ name, edition, version }` — ประกอบเป็นสตริงฝั่ง frontend เช่น `Windows 11 Home` |
| `status` | สถานะ | `ONLINE` / `OFFLINE` (DB อาจมี `WARNING` / `DISABLED` ด้วย) |
| `last_seen` | พบล่าสุด | RFC3339 UTC อาจเป็น `null` ถ้าไม่เคยออนไลน์ |
| `id` | uuid | ใช้เป็น key ของแต่ละแถว |

## อัปเดตแบบเรียลไทม์ (agent_update)

เมื่อ agent ต่อเข้ามาหรือหลุดการเชื่อมต่อ server จะ push ข้อมูลของ "เฉพาะเครื่องนั้น" (รูปแบบเดียวกับ element ใน `data`) ไปยังทุก dashboard ที่เปิดอยู่:

```json
{
  "type": "agent_update",
  "data": {
    "id": "86dbfbcc-a13c-4ffc-adab-7187018273e0",
    "hostname": "lab-pc-01",
    "room_id": "44444444-4444-4444-8444-444444444444",
    "room_name": "ห้องปฏิบัติการ 1",
    "os_info": { "name": "Windows", "edition": "11 Home", "version": "26200" },
    "ip_address": "10.0.0.5",
    "mac_address": "aa:bb:cc:dd:ee:ff",
    "status": "ONLINE",
    "last_seen": "2026-10-08T10:05:12Z"
  }
}
```

วิธีใช้งานฝั่ง frontend: เก็บ state เป็น map ที่ใช้ `id` เป็น key — รับ `snapshot` ครั้งแรกเพื่อเติมทั้งตาราง แล้ว merge แต่ละ `agent_update` ทับเข้าไปตาม `id` (upsert) เมื่อเครื่องออฟไลน์ `status` จะกลายเป็น `OFFLINE` และ `last_seen` จะเป็นเวลาที่เพิ่งพบล่าสุด

## ข้อผิดพลาด

หากระบบรายการ agent ไม่พร้อมใช้งาน หรือส่ง `action` ที่ไม่รองรับ:

```json
{ "type": "agents", "action": "error", "error": "cannot load agents" }
```

ข้อความ error ที่พบได้: `agent list unavailable`, `action must be list or subscribe`, `cannot load agents`

## ตัวอย่าง Next.js Client Component

```ts
const socket = new WebSocket("ws://localhost:8081/ws/frontend");
const agents = new Map<string, Agent>();

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "agents", action: "list" }));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "agents" && message.action === "snapshot") {
    agents.clear();
    for (const a of message.data) agents.set(a.id, a);
    render([...agents.values()]);
  }

  if (message.type === "agent_update") {
    agents.set(message.data.id, message.data); // upsert ตาม uuid
    render([...agents.values()]);
  }
});

function formatOS(os: { name: string; edition: string; version: string }) {
  return [os.name, os.edition, os.version].filter(Boolean).join(" ");
}
```

> หมายเหตุ: `status` กับ `last_seen` มาจากฐานข้อมูล (server เขียนเป็น `ONLINE` + `last_seen = NOW()` ตอนเครื่องต่อ และ `OFFLINE` ตอนหลุด) จึงเป็นค่าที่เชื่อถือได้แม้เครื่องจะออฟไลน์อยู่ ส่วน registry ในหน่วยความจำเก็บเฉพาะเครื่องที่ออนไลน์เท่านั้น
