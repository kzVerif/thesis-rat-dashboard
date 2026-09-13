import "server-only";

import { getAgent } from "../../_lib/agents-server";
import { getRoom } from "../../../rooms/_lib/room-server";
import type { Agent } from "../../_lib/types";
import type { AgentDetail } from "./types";

function osLabel(osInfo: Agent["os_info"]): string {
  if (!osInfo) return "—";

  const values = [osInfo.name, osInfo.version, osInfo.edition]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return values.length > 0 ? values.join(" ") : JSON.stringify(osInfo);
}

export async function getAgentDetail(id: string): Promise<AgentDetail> {
  const agent = await getAgent(id);
  const room = agent.room_id
    ? await getRoom(agent.room_id)
        .then(({ id: roomId, name }) => ({ id: roomId, name }))
    : null;

  return {
    id: agent.id,
    name: agent.hostname,
    status: agent.status,
    room,
    ip: agent.ip_address,
    macAddress: agent.mac_address,
    os: osLabel(agent.os_info),
    lastSeen: agent.last_seen,
    performance: {
      cpu: null,
      ram: { usedGb: null, totalGb: null, percent: null },
      disk: { usedGb: null, totalGb: null, freeGb: null, percent: null },
    },
    processes: [],
    measuredAt: null,
  };
}

export async function stopAgentProcess(id: string, pid: number): Promise<void> {
  void id;
  void pid;
  throw new Error("Backend ยังไม่รองรับคำสั่งหยุด Process");
}

export async function shutdownAgent(id: string): Promise<void> {
  void id;
  throw new Error("Backend ยังไม่รองรับคำสั่งปิดเครื่อง");
}
