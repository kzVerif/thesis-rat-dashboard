import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus } from "@/lib/access-control";
import { z } from "zod";
import { distributionJobStatuses, distributionTargetStatuses, type DistributionListSummary, type DistributionPagination, type FileDistributionJob } from "@/lib/file-distribution";

const requestedBySchema = z.object({ id: z.string(), username: z.string() });
const fileSchema = z.object({ id: z.string(), filename: z.string(), size: z.number().nonnegative() });
const targetSchema = z.object({ type: z.string(), room_id: z.string().nullable().optional(), label: z.string() });
const summarySchema = z.object({ total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), downloading: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), offline: z.number().int().nonnegative() });
const agentSchema = z.object({ agent_id: z.string(), hostname: z.string(), ip_address: z.string().nullable().optional(), status: z.enum(distributionTargetStatuses), progress: z.number().min(0).max(100), downloaded_bytes: z.number().nonnegative(), total_bytes: z.number().nonnegative(), error_code: z.string().nullable().optional(), error_message: z.string().nullable().optional(), updated_at: z.string().nullable().optional() });
const jobSchema = z.object({ id: z.string(), request_id: z.string().nullable().optional(), file: fileSchema, target: targetSchema, status: z.enum(distributionJobStatuses), summary: summarySchema, requested_by: requestedBySchema.nullable().optional(), agents: z.array(agentSchema).optional().default([]), created_at: z.string(), updated_at: z.string(), completed_at: z.string().nullable().optional() });
const listSchema = z.object({ jobs: z.array(jobSchema), summary: z.object({ total_jobs: z.number(), in_progress: z.number(), completed: z.number(), failed: z.number() }), pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), total_pages: z.number() }) });

export class DistributionNotFoundError extends Error {}

async function request(path: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
  const session = (await cookies()).get("__Host-session");
  if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  let response: Response;
  try { response = await fetch(`${apiUrl}${path}`, { headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store" }); }
  catch { throw new Error("ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้"); }
  if (response.status === 404) throw new DistributionNotFoundError("distribution job not found");
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const payload: unknown = await response.json().catch(() => null);
    const message = payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string" ? (payload as { error: string }).error : `Backend returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<unknown>;
}

function mapJob(input: z.infer<typeof jobSchema>): FileDistributionJob {
  return { id: input.id, requestId: input.request_id ?? null, fileId: input.file.id, filename: input.file.filename, fileSize: input.file.size, targetLabel: input.target.label, status: input.status, totalTargets: input.summary.total, onlineTargets: Math.max(0, input.summary.total - input.summary.offline), offlineTargets: input.summary.offline, completedTargets: input.summary.completed, downloadingTargets: input.summary.downloading, failedTargets: input.summary.failed, createdAt: input.created_at, updatedAt: input.updated_at, completedAt: input.completed_at ?? null, requestedBy: input.requested_by ?? null, agents: Object.fromEntries(input.agents.map((agent) => [agent.agent_id, { agentId: agent.agent_id, hostname: agent.hostname, ipAddress: agent.ip_address ?? null, status: agent.status, progress: agent.progress, downloadedBytes: agent.downloaded_bytes, totalBytes: agent.total_bytes, errorCode: agent.error_code ?? null, errorMessage: agent.error_message ?? null, updatedAt: agent.updated_at ?? null }])) };
}

export async function getFileDistributions(input: { page: number; limit: number; q?: string; status?: string }) {
  const query = new URLSearchParams({ page: String(input.page), limit: String(input.limit) });
  if (input.q) query.set("q", input.q);
  if (input.status && input.status !== "ALL") query.set("status", input.status);
  const parsed = listSchema.parse(await request(`/api/file-distributions/?${query}`));
  const summary: DistributionListSummary = { totalJobs: parsed.summary.total_jobs, inProgress: parsed.summary.in_progress, completed: parsed.summary.completed, failed: parsed.summary.failed };
  const pagination: DistributionPagination = { page: parsed.pagination.page, limit: parsed.pagination.limit, total: parsed.pagination.total, totalPages: parsed.pagination.total_pages };
  return { jobs: parsed.jobs.map(mapJob), summary, pagination };
}

export async function getFileDistribution(jobId: string) {
  return mapJob(jobSchema.parse(await request(`/api/file-distributions/${encodeURIComponent(jobId)}`)));
}
