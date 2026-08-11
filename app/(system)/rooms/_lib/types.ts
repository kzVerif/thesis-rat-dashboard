export type Room = {
  id: string;
  name: string;
  description: string | null;
  agent_count: number;
  online_agent_count: number;
  offline_agent_count: number;
  created_at: string;
  updated_at: string;
};

export type RoomInput = {
  name: string;
  description: string | null;
};

export type RoomsResponse = { rooms: Room[] };
export type CreateRoomResponse = { message: string; id: string };

export type RoomActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
