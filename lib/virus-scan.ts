import { z } from "zod";

export const scanModes = ["quick", "custom", "full"] as const;
export type ScanMode = typeof scanModes[number];
export const scanStatuses = ["QUEUED", "DELIVERED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"] as const;
export type ScanStatus = typeof scanStatuses[number];
export const statusLabels: Record<ScanStatus, string> = {
  QUEUED: "รอหลักฐานการส่ง", DELIVERED: "ส่งคำสั่งแล้ว", RUNNING: "กำลังสแกน",
  SUCCEEDED: "สแกนเสร็จแล้ว", FAILED: "สแกนไม่สำเร็จ", CANCELLED: "ยกเลิกแล้ว", EXPIRED: "หมดอายุ",
};
export const isTerminal = (status: ScanStatus) => ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"].includes(status);
export function validScanPath(path: string) {
  return /^(?:[a-zA-Z]:\\|\\\\[^\\]+\\[^\\]+)/.test(path) && !/[\r\n*?"<>|\x00-\x1f]/.test(path);
}
export function scanPayload(mode: ScanMode, agentIds: string[], path?: string) {
  if (!scanModes.includes(mode)) throw new Error("ประเภทการสแกนไม่ถูกต้อง");
  if (!agentIds.length || agentIds.length > 100 || new Set(agentIds).size !== agentIds.length || agentIds.some(id => !z.uuid().safeParse(id).success)) {
    throw new Error("เลือกเครื่อง 1–100 เครื่อง โดยไม่ซ้ำกัน");
  }
  if (mode === "custom" && (!path || !validScanPath(path))) throw new Error("ระบุเส้นทาง Windows แบบเต็มหนึ่งเส้นทาง และห้ามใช้ wildcard");
  return { type: "virus_scan" as const, agent_ids: agentIds, scan_type: mode, ...(mode === "custom" ? { path } : {}) };
}
export const scanRowSchema = z.object({
  job_id: z.string().nullish(), agent_id: z.string(), request_id: z.string(), scan_type: z.enum(scanModes),
  status: z.enum(scanStatuses), path: z.string().nullish(), created_at: z.string(),
  started_at: z.string().nullish(), finished_at: z.string().nullish(), message: z.string().nullish(),
  result: z.record(z.string(), z.unknown()).nullish(),
});
export type ScanRow = z.infer<typeof scanRowSchema>;
export const listSchema = z.object({ type: z.literal("virus_scan_list"), job_id: z.string().optional(), request_id: z.string().optional(), scans: z.array(scanRowSchema) });
export const acceptedSchema = z.object({
  type: z.literal("virus_scan_accepted"), job_id: z.string().optional(), scan_type: z.enum(scanModes), total_targets: z.number().int().min(1).max(100).optional(),
  targets: z.array(z.object({ agent_id: z.string(), request_id: z.string(), dispatch: z.enum(["sent", "uncertain"]) })).optional(),
  agent_id: z.string().optional(), request_id: z.string().optional(), dispatch: z.enum(["sent", "uncertain"]).optional(),
}).refine(e => !!e.targets?.length || !!(e.agent_id && e.request_id && e.dispatch));
export const scanErrorSchema = z.object({ type: z.literal("error"), stream: z.literal("virus_scan"), error: z.string() });
export type ScanJob = { id: string; mode: ScanMode; createdAt: string; path?: string | null; targets: ScanRow[]; expected?: number; complete: boolean; legacy?: boolean; source?: "api" };
export function mergeScanRows(current: ScanJob[], rows: ScanRow[], completeId?: string): ScanJob[] {
  const jobs = new Map(current.map(job => [job.id, job]));
  for (const row of rows) {
    const id = row.job_id || row.request_id;
    const previous = jobs.get(id);
    const targets = new Map(previous?.targets.map(target => [target.request_id, target]));
    const old = targets.get(row.request_id);
    // History or delayed reads must not regress a terminal result.
    targets.set(row.request_id, old && isTerminal(old.status) && !isTerminal(row.status) ? old : row);
    jobs.set(id, { ...previous, id, mode: row.scan_type, path: row.path ?? previous?.path, createdAt: previous?.createdAt ?? row.created_at,
      targets: [...targets.values()], complete: previous?.complete ?? false, legacy: !row.job_id });
  }
  if (completeId) {
    const job = jobs.get(completeId);
    if (job) jobs.set(completeId, { ...job, complete: rows.length > 0 && rows.length >= (job.expected ?? 1) });
  }
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export const jobFinished = (job: ScanJob) => job.complete && job.targets.length >= (job.expected ?? 1) && job.targets.every(t => isTerminal(t.status));
