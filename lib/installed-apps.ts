export const INSTALLED_APPS_TIMEOUT_MS = 17_000;
export const MAX_INSTALLED_APPS = 2000;
export type InstalledApp = {
  name: string;
  version?: string;
  publisher?: string;
  install_date?: string;
  estimated_size_kb?: number;
};
export type InstalledAppsState = {
  status: "loading" | "ready" | "refreshing" | "offline" | "error" | "timeout";
  apps: InstalledApp[];
  updatedAt: string | null;
  error: string | null;
};
export type AppsEvent =
  | { type: "loading" }
  | { type: "ready"; apps: InstalledApp[]; at: string }
  | { type: "offline" }
  | { type: "error" | "timeout"; error: string };
export const initialInstalledAppsState: InstalledAppsState = { status: "offline", apps: [], updatedAt: null, error: null };
export function installedAppsReducer(state: InstalledAppsState, event: AppsEvent): InstalledAppsState {
  switch (event.type) {
    case "loading": return { ...state, status: state.updatedAt ? "refreshing" : "loading", error: null };
    case "ready": return { status: "ready", apps: event.apps, updatedAt: event.at, error: null };
    case "offline": return { ...state, status: "offline", error: null };
    default: return { ...state, status: event.type, error: event.error };
  }
}
export function validInstalledApp(value: unknown): value is InstalledApp {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  const text = (v: unknown, limit: number) => typeof v === "string" && [...v].length <= limit;
  return text(a.name, 512) && (a.name as string).trim().length > 0
    && (a.version === undefined || text(a.version, 256))
    && (a.publisher === undefined || text(a.publisher, 512))
    && (a.install_date === undefined || text(a.install_date, 32))
    && (a.estimated_size_kb === undefined || (typeof a.estimated_size_kb === "number" && Number.isSafeInteger(a.estimated_size_kb) && a.estimated_size_kb >= 0 && a.estimated_size_kb <= 4294967295));
}
export function filterInstalledApps(apps: InstalledApp[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  return q ? apps.filter(a => [a.name, a.version, a.publisher].some(v => v?.toLocaleLowerCase().includes(q))) : apps;
}
export function formatInstallDate(value?: string) {
  if (!value || !/^\d{8}$/.test(value)) return "—";
  const year = Number(value.slice(0, 4)), month = Number(value.slice(4, 6)), day = Number(value.slice(6, 8));
  if (year < 1601 || month < 1 || month > 12 || day < 1) return "—";
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : "—";
}
export function formatInstalledSize(kb?: number) {
  if (kb === undefined || !Number.isSafeInteger(kb) || kb < 0) return "—";
  if (kb < 1024) return `${kb} KB`;
  return kb < 1048576 ? `${(kb / 1024).toFixed(1)} MB` : `${(kb / 1048576).toFixed(1)} GB`;
}

const errors: Record<string, string> = {
  forbidden: "บัญชีนี้ไม่มีสิทธิ์ monitor.read",
  authorization_unavailable: "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่",
  agent_not_found: "ไม่พบ Agent นี้",
  agent_offline: "Agent ออฟไลน์",
  timeout: "รอรายชื่อโปรแกรมเกินเวลาที่กำหนด กรุณาลองอีกครั้ง",
  busy: "Agent หรือระบบมีคำขอค้างอยู่ กรุณาลองอีกครั้ง",
  collection_failed: "Agent อ่านรายชื่อโปรแกรมไม่สำเร็จ",
  invalid_result: "ข้อมูลรายชื่อโปรแกรมไม่ถูกต้องหรือเกินขนาดที่รองรับ",
  send_failed: "ส่งคำขอไปยัง Agent ไม่สำเร็จ",
};

// Uses the detail page's existing socket. Never opens/closes it or subscribes
// to a stream. A controller's lifetime is one agent + one socket connection.
export class InstalledAppsController {
  private pending: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  constructor(private socket: WebSocket, private agentID: string, private emit: (event: AppsEvent) => void) {
    socket.addEventListener("message", this.message);
    socket.addEventListener("close", this.closed);
  }
  request = () => {
    if (this.disposed || this.pending || this.socket.readyState !== 1) return;
    this.pending = crypto.randomUUID();
    this.emit({ type: "loading" });
    this.timer = setTimeout(() => {
      this.clear();
      this.emit({ type: "timeout", error: errors.timeout });
    }, INSTALLED_APPS_TIMEOUT_MS);
    try {
      this.socket.send(JSON.stringify({ type: "installed_apps", action: "get", agent_id: this.agentID, request_id: this.pending }));
    } catch {
      this.clear();
      this.emit({ type: "error", error: errors.send_failed });
    }
  };
  private clear() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }
  private message = (event: MessageEvent) => {
    if (this.disposed || !this.pending || typeof event.data !== "string" || event.data.length > 4 * 1024 * 1024) return;
    let r: Record<string, unknown>;
    try { r = JSON.parse(event.data); } catch { return; }
    if (!r || r.type !== "installed_apps" || r.action !== "result" || r.agent_id !== this.agentID || r.request_id !== this.pending || typeof r.success !== "boolean") return;
    if (r.success) {
      if (!Array.isArray(r.apps) || r.apps.length > MAX_INSTALLED_APPS || !r.apps.every(validInstalledApp)) return;
      this.clear();
      this.emit({ type: "ready", apps: r.apps, at: new Date().toISOString() });
    } else {
      this.clear();
      if (r.code === "agent_offline") this.emit({ type: "offline" });
      else this.emit({ type: r.code === "timeout" ? "timeout" : "error", error: errors[String(r.code)] ?? "โหลดรายชื่อโปรแกรมไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }
  };
  private closed = () => { this.clear(); if (!this.disposed) this.emit({ type: "offline" }); };
  dispose() {
    this.disposed = true;
    this.clear();
    this.socket.removeEventListener("message", this.message);
    this.socket.removeEventListener("close", this.closed);
  }
}
