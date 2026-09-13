import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import type { CreateRoomResponse, Room, RoomInput, RoomsResponse } from "./types";

const errorByStatus: Record<number, string> = {
  400: "ข้อมูลห้องไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  403: "บัญชีนี้ไม่มีสิทธิ์จัดการห้อง",
  404: "ไม่พบห้องที่ต้องการ",
  409: "ชื่อห้องนี้มีอยู่แล้ว",
  500: "ไม่สามารถดำเนินการกับฐานข้อมูลได้",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");

  const cookieStore = await cookies();
  const session = cookieStore.get("__Host-session") || cookieStore.get("session");
  if (!session) throw new Error(errorByStatus[401]);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        cookie: `${session.name}=${session.value}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้");
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const apiError = payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : null;
    const fallbackMessage = errorByStatus[response.status];
    const unknownStatusMessage = `Backend returned HTTP ${response.status}`;
    const message =
      typeof apiError === "string"
        ? apiError
        : fallbackMessage || unknownStatusMessage;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getRooms(): Promise<Room[]> {
  return (await request<RoomsResponse>("/api/rooms/" )).rooms;
}

export async function getRoom(id: string): Promise<Room> {
  return request<Room>(`/api/rooms/${encodeURIComponent(id)}`);
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const created = await request<CreateRoomResponse>("/api/rooms/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return getRoom(created.id);
}

export async function updateRoom(id: string, input: RoomInput): Promise<Room> {
  await request(`/api/rooms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return getRoom(id);
}

export async function removeRoom(id: string): Promise<void> {
  await request<void>(`/api/rooms/${encodeURIComponent(id)}`, { method: "DELETE" });
}
