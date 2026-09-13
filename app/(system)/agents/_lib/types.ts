export type AgentStatus = "ONLINE" | "OFFLINE" | "WARNING" | "DISABLED";

export type Agent = {
  id: string;
  room_id: string | null;
  hostname: string;
  os_info: Record<string, unknown> | null;
  mac_address: string | null;
  ip_address: string | null;
  status: AgentStatus;
  last_seen: string | null;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentInput = Omit<Agent, "id" | "created_at" | "updated_at">;
export type AgentsPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};
export type AgentsResponse = { agents: Agent[]; pagination: AgentsPagination };
export type AgentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
