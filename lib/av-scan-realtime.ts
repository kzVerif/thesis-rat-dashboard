import { z } from "zod";
import { scanErrorSchema, scanModes, scanRowSchema, type ScanJob } from "./virus-scan";

const count = z.number().int().nonnegative();
export const scanSnapshotSchema = z.object({
  type: z.literal("virus_scan_snapshot"),
  summary: z.object({ loaded_jobs: count, pending_results: count, succeeded_results: count, failed_results: count }),
  jobs: z.array(z.object({
    job_id: z.string(), scan_type: z.enum(scanModes), created_at: z.string(),
    path: z.string().nullish(), scans: z.array(scanRowSchema),
  })),
});

type State = {
  connection: "connecting" | "live" | "reconnecting" | "disconnected";
  jobs: ScanJob[];
  summary: z.infer<typeof scanSnapshotSchema>["summary"];
  loading: boolean;
  active: boolean;
  error: string | null;
  updatedAt: string | null;
};

// Dedicated read-only subscription: no scan commands or frontend polling.
export class AvScanRealtimeClient {
  private state: State = {
    connection: "connecting", jobs: [],
    summary: { loaded_jobs: 0, pending_results: 0, succeeded_results: 0, failed_results: 0 },
    loading: true, active: false, error: null, updatedAt: null,
  };
  private listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private stopped = true;
  private halted = false;
  private retries = 0;
  private reconnect?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;

  constructor(private url: string, private createSocket: (url: string) => WebSocket = url => new WebSocket(url)) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  start = () => {
    this.stopped = false;
    this.halted = false;
    this.connect();
    return () => this.stop();
  };
  private fail(message: string) {
    this.halted = true;
    clearTimeout(this.timeout);
    this.update({ error: message, loading: false, active: false });
  }
  private connect() {
    if (this.stopped) return;
    this.update({ connection: this.retries ? "reconnecting" : "connecting", loading: true, active: false });
    let socket: WebSocket;
    try { socket = this.createSocket(this.url); } catch {
      this.fail("ไม่สามารถเปิด WebSocket ได้ กรุณาตรวจสอบ URL แล้วลองเชื่อมต่อใหม่");
      this.update({ connection: "disconnected" });
      return;
    }
    this.socket = socket;
    this.timeout = setTimeout(() => {
      if (this.socket === socket) socket.close();
    }, 15000);
    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return;
      clearTimeout(this.timeout);
      this.update({ connection: "live" });
      this.requestSnapshot();
    };
    socket.onmessage = event => {
      if (this.socket !== socket || this.stopped || this.halted || typeof event.data !== "string") return;
      let raw: unknown;
      try { raw = JSON.parse(event.data); } catch { return; }
      const error = scanErrorSchema.safeParse(raw);
      if (error.success) { this.fail(error.data.error); return; }
      const parsed = scanSnapshotSchema.safeParse(raw);
      if (!parsed.success) {
        if (raw && typeof raw === "object" && "type" in raw && raw.type === "virus_scan_snapshot") {
          this.fail("รูปแบบข้อมูลผลสแกนไม่ถูกต้อง กรุณาลองเชื่อมต่อใหม่");
        }
        return;
      }
      clearTimeout(this.timeout);
      this.retries = 0;
      // Snapshots include every target of each loaded job, including deletions.
      const jobs: ScanJob[] = parsed.data.jobs.map(job => ({
        id: job.job_id, mode: job.scan_type, createdAt: job.created_at,
        path: job.path ?? job.scans.find(scan => scan.path)?.path,
        targets: job.scans, expected: job.scans.length, complete: true, source: "realtime",
      }));
      this.update({ jobs, summary: parsed.data.summary, loading: false, active: true, error: null, updatedAt: new Date().toISOString() });
    };
    socket.onerror = () => {
      if (this.socket === socket && !this.stopped) this.update({ active: false, error: "เชื่อมต่อไม่ได้ กรุณาตรวจสอบ session สิทธิ์ av.scan และการตั้งค่า WebSocket" });
    };
    socket.onclose = () => {
      if (this.socket !== socket || this.stopped) return;
      clearTimeout(this.timeout);
      this.socket = null;
      this.update({ connection: this.halted ? "disconnected" : "reconnecting", loading: false, active: false });
      if (!this.halted) this.reconnect = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retries++, 15000));
    };
  }
  private requestSnapshot() {
    if (this.socket?.readyState !== 1) return;
    this.halted = false;
    this.update({ loading: true, active: false, error: null });
    try {
      this.socket.send(JSON.stringify({ type: "virus_scan_subscribe", limit: 100 }));
      this.timeout = setTimeout(() => this.fail("ยังไม่ได้รับผลสแกน กรุณาลองเชื่อมต่อใหม่"), 15000);
    } catch {
      this.fail("ส่งคำขอติดตามผลไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่");
    }
  }
  refresh = () => {
    if (this.stopped) return;
    clearTimeout(this.reconnect);
    clearTimeout(this.timeout);
    this.halted = false;
    if (this.socket?.readyState === 1) this.requestSnapshot();
    else {
      const socket = this.socket;
      this.socket = null;
      socket?.close();
      this.connect();
    }
  };
  private stop() {
    this.stopped = true;
    clearTimeout(this.timeout);
    clearTimeout(this.reconnect);
    const socket = this.socket;
    this.socket = null;
    if (socket?.readyState === 1) {
      try { socket.send(JSON.stringify({ type: "virus_scan_unsubscribe" })); } catch { /* Closing also ends the subscription. */ }
    }
    socket?.close();
  }
}
