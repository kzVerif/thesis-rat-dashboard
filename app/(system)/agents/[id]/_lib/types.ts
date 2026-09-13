import type { AgentStatus } from "../../_lib/types";

export type { AgentStatus } from "../../_lib/types";

export type AgentProcess = {
  pid: number;
  name: string;
};

export type AgentDetail = {
  id: string;
  name: string;
  status: AgentStatus;
  room: { id: string; name: string } | null;
  ip: string | null;
  macAddress: string | null;
  os: string;
  lastSeen: string | null;
  performance: {
    cpu: number | null;
    ram: { usedGb: number | null; totalGb: number | null; percent: number | null };
    disk: { usedGb: number | null; totalGb: number | null; freeGb: number | null; percent: number | null };
  };
  processes: AgentProcess[];
  measuredAt: string | null;
};

export type PerformanceSample = {
  cpu_usage: number;
  ram_total_gb: number;
  ram_used_gb: number;
  ram_usage: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_usage: number;
};

export type AgentCommandResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
