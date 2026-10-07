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

// enrolled_at may be omitted; the server keeps the stored value in that case.
export type AgentInput = Omit<Agent, "id" | "created_at" | "updated_at" | "enrolled_at"> & { enrolled_at?: string | null };

/** Agent as pushed by /ws/frontend (`agents` snapshot / `agent_update`). */
export type LiveAgent = Pick<Agent, "id" | "hostname" | "room_id" | "os_info" | "ip_address" | "mac_address" | "status" | "last_seen"> & {
  room_name?: string;
};
/** Row shown in the agents table: REST fields when known, merged with realtime fields. */
export type AgentRow = LiveAgent & Partial<Pick<Agent, "enrolled_at" | "created_at" | "updated_at">>;
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
