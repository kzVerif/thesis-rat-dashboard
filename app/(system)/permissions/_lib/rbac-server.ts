import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus } from "@/lib/access-control";
import type { Permission, Role, RoleInput } from "./types";

type RolesResponse = { roles: Role[] };
type PermissionsResponse = { permissions: Permission[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนด API_URL");

  const cookieStore = await cookies();
  const session = cookieStore.get("__Host-session") || cookieStore.get("session");
  if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");

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
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const payload: unknown = await response.json().catch(() => null);
    const backendMessage = payload && typeof payload === "object"
      ? (payload as { error?: unknown; message?: unknown }).error ?? (payload as { message?: unknown }).message
      : null;
    const detail = typeof backendMessage === "string" ? backendMessage : null;
    const fallback: Record<number, string> = {
      400: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      403: "บัญชีนี้ไม่มีสิทธิ์จัดการบทบาท",
      404: "ไม่พบข้อมูลที่ต้องการ",
      409: "ข้อมูลซ้ำหรือบทบาทนี้กำลังถูกใช้งานอยู่",
    };
    throw new Error(detail || fallback[response.status] || `ระบบหลังบ้านตอบกลับด้วยสถานะ ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getRoles(): Promise<Role[]> {
  return (await request<RolesResponse>("/api/roles")).roles;
}

export async function getPermissions(): Promise<Permission[]> {
  return (await request<PermissionsResponse>("/api/permissions")).permissions;
}

export async function createRole(input: RoleInput): Promise<void> {
  await request("/api/roles", { method: "POST", body: JSON.stringify(input) });
}

export async function updateRole(id: string, input: RoleInput): Promise<void> {
  await request(`/api/roles/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function removeRole(id: string): Promise<void> {
  await request(`/api/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
}
