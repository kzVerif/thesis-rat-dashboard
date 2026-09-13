import type { AgentStatus } from "../../agents/_lib/types";

export type ScreenRoom = { id: string; name: string; description: string | null; agentCount: number; onlineAgentCount: number };
export type ScreenAgent = { id: string; name: string; roomId: string; status: AgentStatus };
export type ScreensSnapshot = { rooms: ScreenRoom[]; agents: ScreenAgent[] };
