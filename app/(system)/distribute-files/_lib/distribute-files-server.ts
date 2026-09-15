import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus } from "@/lib/access-control";
import type { DistributionSnapshot } from "./types";

type ApiFile = {
  id: string;
  filename: string;
  extension: string;
  file_size: number;
};

type ApiAgent = {
  id: string;
  room_id: string | null;
  hostname: string;
  ip_address: string | null;
  status: string;
};

type ApiRoom = {
  id: string;
  name: string;
  description: string | null;
  agent_count: number;
};

type PaginatedResponse<T, K extends string> = Record<K, T[]> & {
  pagination: { total_pages: number };
};

async function request<T>(path: string, cookie: string): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
  } catch {
    throw new Error("ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      interruptForApiStatus(response.status);
    }
    const payload: unknown = await response.json().catch(() => null);
    const apiError = payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(
      typeof apiError === "string"
        ? apiError
        : `Backend returned HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

async function getAllPages<T, K extends "files" | "agents">(
  path: string,
  key: K,
  cookie: string,
): Promise<T[]> {
  const first = await request<PaginatedResponse<T, K>>(
    `${path}?page=1&limit=100`,
    cookie,
  );
  const remainingPages = Array.from(
    { length: Math.max(0, first.pagination.total_pages - 1) },
    (_, index) => index + 2,
  );
  const remaining = await Promise.all(
    remainingPages.map((page) =>
      request<PaginatedResponse<T, K>>(
        `${path}?page=${page}&limit=100`,
        cookie,
      ),
    ),
  );
  return [first, ...remaining].flatMap((response) => response[key]);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

export async function getDistributionSnapshot(): Promise<DistributionSnapshot> {
  const session = (await cookies()).get("__Host-session");
  if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  const cookie = `${session.name}=${session.value}`;

  const [files, agents, roomsResponse] = await Promise.all([
    getAllPages<ApiFile, "files">("/api/files/", "files", cookie),
    getAllPages<ApiAgent, "agents">("/api/agents/", "agents", cookie),
    request<{ rooms: ApiRoom[] }>("/api/rooms/", cookie),
  ]);
  const roomNames = new Map(roomsResponse.rooms.map((room) => [room.id, room.name]));

  return {
    files: files.map((file) => ({
      id: file.id,
      name: file.filename,
      type: file.extension.replace(/^\./, "").toUpperCase() || "FILE",
      size: formatFileSize(file.file_size),
      sizeBytes: file.file_size,
    })),
    computers: agents.map((agent) => ({
      id: agent.id,
      name: agent.hostname,
      description:
        (agent.room_id && roomNames.get(agent.room_id)) ||
        agent.ip_address ||
        "ยังไม่ได้จัดห้อง",
      roomId: agent.room_id,
      ipAddress: agent.ip_address,
      status: agent.status,
    })),
    rooms: roomsResponse.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: `${room.agent_count} เครื่อง`,
    })),
  };
}
