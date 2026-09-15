import "server-only";

import { getAgents } from "../../agents/_lib/agents-server";
import { getRooms } from "../../rooms/_lib/room-server";
import { isAccessInterrupt } from "@/lib/access-control";
import type { ScanSnapshot } from "./types";

export async function getScanSnapshot(): Promise<ScanSnapshot> {
  try {
    const [rooms, firstPage] = await Promise.all([getRooms(), getAgents(1, 100)]);
    const pages = [firstPage];
    // Bound concurrent requests while still loading every page of targets.
    for (let page = 2; page <= firstPage.pagination.total_pages; page += 5) {
      pages.push(...await Promise.all(
        Array.from({ length: Math.min(5, firstPage.pagination.total_pages - page + 1) },
          (_, offset) => getAgents(page + offset, 100)),
      ));
    }
    const roomNames = new Map(rooms.map(room => [room.id, room.name]));
    const agents = new Map(pages.flatMap(page => page.agents).map(agent => [agent.id, agent]));
    return {
      rooms: rooms.map(room => ({ id: room.id, name: room.name })),
      computers: [...agents.values()].map(agent => ({
        id: agent.id,
        hostname: agent.hostname,
        roomId: agent.room_id,
        room: agent.room_id ? roomNames.get(agent.room_id) ?? "ไม่พบข้อมูลห้อง" : "ยังไม่ได้จัดห้อง",
        ip: agent.ip_address ?? "ไม่มี IP Address",
        agentStatus: agent.status,
        online: agent.status === "ONLINE",
      })),
    };
  } catch (error) {
    if (isAccessInterrupt(error)) throw error;
    return { rooms: [], computers: [], error: error instanceof Error ? error.message : "โหลดข้อมูลห้องและเครื่องไม่สำเร็จ" };
  }
}
