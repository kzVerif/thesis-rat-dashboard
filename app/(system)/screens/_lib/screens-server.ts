import "server-only";

import { getAgents } from "../../agents/_lib/agents-server";
import { getRooms } from "../../rooms/_lib/room-server";
import type { ScreensSnapshot } from "./types";

const PAGE_SIZE = 100;

export async function getScreensSnapshot(): Promise<ScreensSnapshot> {
  const [rooms, firstPage] = await Promise.all([getRooms(), getAgents(1, PAGE_SIZE)]);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.total_pages - 1) }, (_, index) =>
      getAgents(index + 2, PAGE_SIZE),
    ),
  );
  const agents = [firstPage, ...remainingPages]
    .flatMap((page) => page.agents)
    .filter((agent) => agent.room_id !== null)
    .map((agent) => ({ id: agent.id, name: agent.hostname, roomId: agent.room_id!, status: agent.status }));

  return {
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      agentCount: room.agent_count,
      onlineAgentCount: room.online_agent_count,
    })),
    agents,
  };
}
