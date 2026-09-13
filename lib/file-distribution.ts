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
  filename: string;
  fileSize: number;
  targetLabel: string;
  target: { type: "ROOM"; room_id: string } | { type: "AGENTS"; agent_ids: string[] };
  computers: DistributionComputerInput[];
};

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

export function deriveJobStatus(agents: DistributionAgent[]): DistributionJobStatus {
  if (!agents.length) return "FAILED";
  const active = agents.some((agent) => ["PENDING", "SENT", "DOWNLOADING", "VERIFYING"].includes(agent.status));
  if (active) return "IN_PROGRESS";
  const completed = agents.filter((agent) => agent.status === "COMPLETED").length;
  if (completed === agents.length) return "COMPLETED";
  return completed > 0 ? "PARTIAL_FAILED" : "FAILED";
}
