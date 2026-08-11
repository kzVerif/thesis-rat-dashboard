import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import type { CreateUserResponse, RoleOption, RolesResponse, User, UserInput, UsersResponse } from "./types";

const errors: Record<number, string> = {
  400: "ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  403: "บัญชีนี้ไม่มีสิทธิ์จัดการผู้ใช้",
  404: "ไม่พบผู้ใช้ที่ต้องการ",
  409: "ชื่อผู้ใช้หรืออีเมลถูกใช้งานแล้ว หรือบัญชีนี้ไม่สามารถลบได้",
  500: "ไม่สามารถดำเนินการกับข้อมูลผู้ใช้ได้",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
  const session = (await cookies()).get("__Host-session");
  if (!session) throw new Error(errors[401]);

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
    const apiError = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null;
    const fallback = errors[response.status] || `Backend returned HTTP ${response.status}`;
    throw new Error(typeof apiError === "string" ? apiError : fallback);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getUsers(): Promise<User[]> {
  return (await request<UsersResponse>("/api/users/")).users;
}

export async function getUserRoles(): Promise<RoleOption[]> {
  return (await request<RolesResponse>("/api/roles")).roles;
}

export async function getUser(id: string): Promise<User> {
  return request<User>(`/api/users/${encodeURIComponent(id)}`);
}

export async function createUser(input: UserInput): Promise<User> {
  const created = await request<CreateUserResponse>("/api/users/", { method: "POST", body: JSON.stringify(input) });
  return getUser(created.id);
}

export async function updateUser(id: string, input: UserInput): Promise<User> {
  await request(`/api/users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
  return getUser(id);
}

export async function removeUser(id: string): Promise<void> {
  await request<void>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
