export type AgentStatus = "online" | "offline";

export type AgentProcess = {
  pid: number;
  name: string;
  cpu: number;
  memoryMb: number;
  user: string;
};

export type AgentDetail = {
  id: string;
  name: string;
  status: AgentStatus;
  room: { id: string; name: string } | null;
  ip: string;
  macAddress: string;
  os: string;
  lastSeen: string;
  performance: {
    cpu: number;
    ram: { usedGb: number; totalGb: number; percent: number };
    disk: { usedGb: number; totalGb: number; percent: number };
  };
  processes: AgentProcess[];
  measuredAt: string;
};

export type AgentCommandResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

