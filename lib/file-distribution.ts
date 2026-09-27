import { z } from "zod";

export const distributionTargetStatuses = [
  "PENDING", "SENT", "DOWNLOADING", "VERIFYING", "COMPLETED",
  "FAILED", "OFFLINE", "CANCELLED",
] as const;
export const distributionJobStatuses = [
  "IN_PROGRESS", "COMPLETED", "PARTIAL_FAILED", "FAILED", "CANCELLED",
] as const;

export type DistributionTargetStatus = (typeof distributionTargetStatuses)[number];
export type DistributionJobStatus = (typeof distributionJobStatuses)[number];
export type DistributionConnectionState = "connecting" | "live" | "reconnecting" | "disconnected";

export type DistributionAgent = {
  agentId: string;
  hostname: string;
  ipAddress: string | null;
  status: DistributionTargetStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  updatedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type FileDistributionJob = {
  id: string;
  requestId: string | null;
  fileId: string;
  filename: string;
  fileSize: number;
  targetLabel: string;
  status: DistributionJobStatus;
  totalTargets: number;
  onlineTargets: number;
  offlineTargets: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completedTargets: number;
  downloadingTargets: number;
  failedTargets: number;
  requestedBy: { id: string; username: string } | null;
  agents: Record<string, DistributionAgent>;
};

export type DistributionListSummary = {
  totalJobs: number;
  inProgress: number;
  completed: number;
  failed: number;
};

export type DistributionPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DistributionComputerInput = {
  id: string;
  hostname: string;
  ipAddress: string | null;
  status: string;
};

export type DistributionRequest = {
  fileId: string;
  destinationPath?: string;
  filename: string;
  fileSize: number;
  targetLabel: string;
  target: { type: "ROOM"; room_id: string } | { type: "AGENTS"; agent_ids: string[] };
  computers: DistributionComputerInput[];
};

export function validateDestinationPath(path: string): string | null {
  if (path === "") return null;
  if (new TextEncoder().encode(path).length > 4096) return "โฟลเดอร์ปลายทางต้องยาวไม่เกิน 4096 bytes";
  // Do not normalize or trim: the server preserves valid paths verbatim.
  const windows = /^[A-Za-z]:[\\/]/.test(path);
  const posix = path.startsWith("/") && !path.startsWith("//");
  const hasControl = Array.from(path).some((char) => char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159));
  if ((!windows && !posix) || path.startsWith("\\\\") || hasControl) {
    return "ระบุ absolute local path เช่น D:\\Shared Files หรือ /srv/shared (ไม่รองรับ network/device path)";
  }
  if (path.split(/[\\/]/).some((part) => part === "." || part === "..")) return "โฟลเดอร์ปลายทางต้องไม่มีส่วน . หรือ ..";
  return null;
}

export function createDistributionPayload(request: DistributionRequest, requestId: string): string {
  const pathError = validateDestinationPath(request.destinationPath ?? "");
  if (pathError) throw new Error(pathError);
  const target = request.target.type === "AGENTS"
    ? { type: "AGENTS" as const, agent_ids: [...new Set(request.target.agent_ids)] }
    : request.target;
  const validTarget = target.type === "ROOM" ? z.uuid().safeParse(target.room_id).success
    : target.agent_ids.length > 0 && target.agent_ids.every((id) => z.uuid().safeParse(id).success);
  if (!z.uuid().safeParse(request.fileId).success || !z.uuid().safeParse(requestId).success || !validTarget) {
    throw new Error("ข้อมูลไฟล์หรือปลายทางไม่ถูกต้อง กรุณาโหลดหน้าใหม่");
  }
  return JSON.stringify({ type: "FILE_DISTRIBUTE", request_id: requestId, file_id: request.fileId,
    destination_path: request.destinationPath || undefined, target });
}

export const fileDistributionCreatedSchema = z.object({
  type: z.literal("FILE_DISTRIBUTION_CREATED"),
  job_id: z.uuid(),
  file_id: z.uuid(),
  total_targets: z.number().int().nonnegative(),
  online_targets: z.number().int().nonnegative(),
  offline_targets: z.number().int().nonnegative(),
  status: z.enum(distributionJobStatuses),
});

export const fileDistributionTargetUpdateSchema = z.object({
  type: z.literal("FILE_DISTRIBUTION_TARGET_UPDATE"),
  job_id: z.uuid(),
  agent_id: z.uuid(),
  hostname: z.string().optional(),
  status: z.enum(distributionTargetStatuses),
  progress: z.number().min(0).max(100),
  downloaded_bytes: z.number().nonnegative(),
  total_bytes: z.number().nonnegative().optional().default(0),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

export const fileDistributionErrorSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
});

export type DistributionTargetUpdate = z.infer<typeof fileDistributionTargetUpdateSchema>;

export function applyDistributionUpdate(job: FileDistributionJob, update: DistributionTargetUpdate): FileDistributionJob {
  const previous = job.agents[update.agent_id];
  const updatedAt = update.updated_at ?? new Date().toISOString();
  const agents = { ...job.agents, [update.agent_id]: {
    agentId: update.agent_id, hostname: update.hostname ?? previous?.hostname ?? update.agent_id,
    ipAddress: previous?.ipAddress ?? null, status: update.status, progress: update.progress,
    downloadedBytes: update.downloaded_bytes, totalBytes: update.total_bytes,
    updatedAt, errorCode: update.error_code ?? null, errorMessage: update.error_message ?? null,
  } };
  const values = Object.values(agents);
  const offlineRows = values.filter((agent) => agent.status === "OFFLINE").length;
  const offlineTargets = Math.max(job.offlineTargets ?? 0, offlineRows);
  // Summary-only REST responses do not contain all target rows. Keep their
  // authoritative status until all targets are accounted for. CREATED supplies
  // the offline count even when offline agents never publish an update.
  const completeSnapshot = values.length - offlineRows + offlineTargets === job.totalTargets;
  const completedTargets = values.filter((agent) => agent.status === "COMPLETED").length;
  const downloadingTargets = values.filter((agent) => ["PENDING", "SENT", "DOWNLOADING", "VERIFYING"].includes(agent.status)).length;
  const status = downloadingTargets ? "IN_PROGRESS" : completedTargets === job.totalTargets ? "COMPLETED" : completedTargets ? "PARTIAL_FAILED" : "FAILED";
  return { ...job, agents, updatedAt,
    ...(completeSnapshot ? {
      status: job.status === "CANCELLED" ? job.status : status,
      completedTargets,
      downloadingTargets,
      failedTargets: values.filter((agent) => agent.status === "FAILED").length,
      offlineTargets,
    } : {}),
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`;
}

export function formatRelativeTime(value: string | null, now = Date.now()): string {
  if (!value) return "-";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "-";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return "เมื่อสักครู่";
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

export function deriveJobStatus(agents: DistributionAgent[], totalTargets = agents.length): DistributionJobStatus {
  if (agents.length < totalTargets) return "IN_PROGRESS";
  if (!agents.length) return "FAILED";
  const active = agents.some((agent) => ["PENDING", "SENT", "DOWNLOADING", "VERIFYING"].includes(agent.status));
  if (active) return "IN_PROGRESS";
  const completed = agents.filter((agent) => agent.status === "COMPLETED").length;
  if (completed === agents.length) return "COMPLETED";
  return completed > 0 ? "PARTIAL_FAILED" : "FAILED";
}
