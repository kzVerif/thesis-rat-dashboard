import { acceptedSchema, jobFinished, listSchema, mergeScanRows, scanErrorSchema, scanPayload, type ScanJob, type ScanMode } from "./virus-scan";

type Connection = "connecting" | "live" | "reconnecting" | "disconnected";
export type ScanState = { connection: Connection; jobs: ScanJob[]; submitting: boolean; loading: boolean; historyLoaded: boolean; error: string | null; uncertain: boolean; updatedAt: string | null };
type Read = { kind: "read"; id?: string; legacy?: boolean };
type Create = { kind: "create"; payload: ReturnType<typeof scanPayload>; resolve: (id: string) => void; reject: (error: Error) => void };
type Request = Read | Create;
const uncertainMessage = "ยังไม่ได้รับการยืนยัน อาจมีการสร้างงานแล้ว กรุณาตรวจประวัติก่อนสั่งใหม่ ระบบจะไม่ส่งคำสั่งซ้ำอัตโนมัติ";

// Serialize all commands: protocol errors have no request ID for correlation.
export class VirusScanClient {
  private state: ScanState = { connection: "connecting", jobs: [], submitting: false, loading: false, historyLoaded: false, error: null, uncertain: false, updatedAt: null };
  private listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private queue: Request[] = [];
  private pending: Request | null = null;
  private timeout?: ReturnType<typeof setTimeout>;
  private reconnect?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;
  private stopped = true;
  private retries = 0;
  constructor(private url: string, private createSocket: (url: string) => WebSocket = url => new WebSocket(url)) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<ScanState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  start = () => {
    this.stopped = false;
    this.connect();
    this.poll = setInterval(() => {
      if (this.state.connection !== "live") return;
      this.state.jobs.filter(job => !jobFinished(job)).forEach(job => this.read(job.id, job.legacy));
    }, 3000);
    return () => this.stop();
  };
  private connect() {
    if (this.stopped) return;
    this.update({ connection: this.retries ? "reconnecting" : "connecting" });
    let socket: WebSocket;
    try { socket = this.createSocket(this.url); } catch {
      this.update({ connection: "disconnected", error: "ไม่สามารถเปิด WebSocket ได้ กรุณาตรวจสอบการตั้งค่า URL" });
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return;
      this.retries = 0;
      this.update({ connection: "live", historyLoaded: false });
      this.read();
      this.state.jobs.forEach(job => this.read(job.id, job.legacy));
    };
    socket.onmessage = event => {
      if (this.socket !== socket || this.stopped || typeof event.data !== "string") return;
      let raw: unknown;
      try { raw = JSON.parse(event.data); } catch { return; }
      const error = scanErrorSchema.safeParse(raw);
      if (error.success) {
        if (this.pending?.kind === "create") this.pending.reject(new Error(error.data.error));
        this.update({ error: error.data.error, submitting: false });
        this.finish();
        return;
      }
      const accepted = acceptedSchema.safeParse(raw);
      if (accepted.success && this.pending?.kind === "create") {
        const event = accepted.data;
        const request = this.pending;
        const targets = event.targets ?? [{ agent_id: event.agent_id!, request_id: event.request_id!, dispatch: event.dispatch! }];
        const id = event.job_id ?? targets[0].request_id;
        const createdAt = new Date().toISOString();
        const job: ScanJob = { id, mode: event.scan_type, createdAt, path: request.payload.path, expected: event.total_targets ?? targets.length, complete: false, legacy: !event.job_id,
          targets: targets.map(t => ({ job_id: event.job_id, agent_id: t.agent_id, request_id: t.request_id, scan_type: event.scan_type, created_at: createdAt,
            status: t.dispatch === "sent" ? "DELIVERED" : "QUEUED", message: t.dispatch === "uncertain" ? "การส่งไม่แน่นอน ยังไม่ได้รับผล ไม่ส่งคำสั่งซ้ำอัตโนมัติ" : undefined })),
        };
        this.update({ jobs: [job, ...this.state.jobs.filter(j => j.id !== id)], submitting: false, error: null });
        request.resolve(id);
        this.finish();
        this.read(id, job.legacy);
        return;
      }
      const list = listSchema.safeParse(raw);
      if (list.success && this.pending?.kind === "read") {
        const request = this.pending;
        if (request.id && (request.legacy ? list.data.request_id : list.data.job_id) !== request.id) return;
        if (!request.id && (list.data.job_id || list.data.request_id)) return;
        const jobs = mergeScanRows(this.state.jobs, list.data.scans, request.id);
        this.update({ jobs, historyLoaded: this.state.historyLoaded || !request.id, updatedAt: new Date().toISOString(), error: null });
        this.finish();
        if (!request.id) jobs.filter(j => !j.complete).forEach(j => this.read(j.id, j.legacy));
      }
    };
    socket.onerror = () => { if (this.socket === socket) this.update({ error: "เชื่อมต่อไม่ได้ กรุณาตรวจสอบ session สิทธิ์ agents.manage และการตั้งค่า WebSocket" }); };
    socket.onclose = () => {
      if (this.socket !== socket || this.stopped) return;
      this.socket = null;
      this.dropRequests();
      this.update({ connection: "reconnecting", loading: false, historyLoaded: false });
      this.reconnect = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retries++, 15000));
    };
  }
  private dropRequests() {
    clearTimeout(this.timeout);
    if (this.pending?.kind === "create") {
      this.pending.reject(new Error(uncertainMessage));
      this.update({ uncertain: true, error: uncertainMessage });
    }
    for (const request of this.queue) if (request.kind === "create") request.reject(new Error("ยังไม่ได้ส่งคำสั่ง เนื่องจากการเชื่อมต่อหลุด"));
    this.pending = null;
    this.queue = [];
    this.update({ submitting: false });
  }
  private stop() {
    this.stopped = true;
    clearInterval(this.poll);
    clearTimeout(this.reconnect);
    this.dropRequests();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
  private finish() {
    clearTimeout(this.timeout);
    this.pending = null;
    this.update({ loading: false });
    this.pump();
  }
  private pump() {
    if (this.pending || this.socket?.readyState !== 1 || !this.queue.length) return;
    const request = this.queue.shift()!;
    this.pending = request;
    this.update({ loading: request.kind === "read" });
    const payload = request.kind === "create" ? request.payload : { type: "virus_scan_list", limit: 100, ...(request.id ? request.legacy ? { request_id: request.id } : { job_id: request.id } : {}) };
    try { this.socket.send(JSON.stringify(payload)); } catch {
      this.dropRequests();
      this.socket.close();
      return;
    }
    this.timeout = setTimeout(() => {
      // A missing reply is not a failed scan. Reconnect before correlating more replies.
      this.update({ error: request.kind === "create" ? uncertainMessage : "ยังไม่ได้รับข้อมูลสถานะ กำลังเชื่อมต่อใหม่" });
      this.dropRequests();
      this.socket?.close();
    }, 15000);
  }
  private read(id?: string, legacy?: boolean) {
    if (this.state.connection !== "live") return;
    if ([this.pending, ...this.queue].some(r => r?.kind === "read" && r.id === id)) return;
    this.queue.push({ kind: "read", id, legacy });
    this.pump();
  }
  refresh = () => { this.read(); this.state.jobs.forEach(job => this.read(job.id, job.legacy)); };
  acknowledgeUncertain = () => { if (this.state.historyLoaded) this.update({ uncertain: false }); };
  submit = (mode: ScanMode, ids: string[], path?: string): Promise<string> => {
    const payload = scanPayload(mode, ids, path);
    if (this.state.connection !== "live" || this.socket?.readyState !== 1) throw new Error("WebSocket ยังไม่ได้เชื่อมต่อ");
    if (this.state.submitting || this.state.uncertain) throw new Error("กรุณารอการยืนยันหรือตรวจประวัติงานก่อนสั่งใหม่");
    this.update({ submitting: true, error: null });
    return new Promise((resolve, reject) => { this.queue.unshift({ kind: "create", payload, resolve, reject }); this.pump(); });
  };
}
