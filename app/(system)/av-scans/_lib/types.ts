import type { AgentStatus } from "../../agents/_lib/types";

export type ScanComputer = {
  id: string;
  hostname: string;
  roomId: string | null;
  room: string;
  ip: string;
  agentStatus: AgentStatus;
  online: boolean;
};

export type ScanSnapshot = {
  rooms: { id: string; name: string }[];
  computers: ScanComputer[];
  error?: string;
};
