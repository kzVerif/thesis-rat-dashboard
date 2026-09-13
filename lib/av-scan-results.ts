import { z } from "zod";
import { scanModes, type ScanJob, type ScanStatus } from "./virus-scan";

export const avScanResultsSchema = z.object({
  av_scan_results: z.array(z.object({
    id: z.string(), agent_id: z.string(), command_id: z.string().nullable(), job_id: z.string().nullable(),
    scan_type: z.enum(scanModes), status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
    started_at: z.string().nullable(), finished_at: z.string().nullable(), created_at: z.string(),
    total_files_scanned: z.number().nullable(), threats_found: z.number().nullable(), threat_details: z.unknown(),
  })),
  pagination: z.object({ page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(), total_pages: z.number().int().nonnegative() }),
});
export type AvScanResult = z.infer<typeof avScanResultsSchema>["av_scan_results"][number];

const statuses: Record<AvScanResult["status"], ScanStatus> = {
  PENDING: "QUEUED", RUNNING: "RUNNING", COMPLETED: "SUCCEEDED", FAILED: "FAILED", CANCELLED: "CANCELLED",
};

export function resultJobs(rows: AvScanResult[]): ScanJob[] {
  const jobs = new Map<string, ScanJob>();
  for (const row of rows) {
    // The backend stores the complete agent event in threat_details.
    const event = row.threat_details && typeof row.threat_details === "object" && !Array.isArray(row.threat_details)
      ? row.threat_details as Record<string, unknown> : null;
    const report = event?.report && typeof event.report === "object" && !Array.isArray(event.report)
      ? event.report as Record<string, unknown> : null;
    const id = row.job_id ?? row.id;
    const job: ScanJob = jobs.get(id) ?? { id, mode: row.scan_type, createdAt: row.created_at, targets: [], complete: false, source: "api" };
    if (row.created_at < job.createdAt) job.createdAt = row.created_at;
    job.targets.push({
      job_id: row.job_id, agent_id: row.agent_id, request_id: row.id, scan_type: row.scan_type,
      status: statuses[row.status], created_at: row.created_at, started_at: row.started_at, finished_at: row.finished_at,
      message: typeof event?.message === "string" ? event.message : undefined,
      result: { id: row.id, command_id: row.command_id, status: row.status, total_files_scanned: row.total_files_scanned, threats_found: row.threats_found, threat_details: row.threat_details,
        ...(report ? { report } : {}), ...(event?.error != null ? { error: event.error } : {}),
      },
    });
    jobs.set(id, job);
  }
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
