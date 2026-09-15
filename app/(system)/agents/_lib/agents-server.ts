import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus } from "@/lib/access-control";
import type { Agent, AgentInput, AgentsResponse } from "./types";

const errors: Record<number, string> = {
  400: "ข้อมูล Agent ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  403: "บัญชีนี้ไม่มีสิทธิ์จัดการ Agent",
  404: "ไม่พบ Agent ที่ต้องการ",
  500: "ไม่สามารถดำเนินการกับข้อมูล Agent ได้",
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
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const payload: unknown = await response.json().catch(() => null);
    const apiError = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null;
    throw new Error(typeof apiError === "string" ? apiError : errors[response.status] || `Backend returned HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getAgents(page = 1, limit = 20): Promise<AgentsResponse> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request<AgentsResponse>(`/api/agents/?${query}`);
}

export async function getAgent(id: string): Promise<Agent> {
  return request<Agent>(`/api/agents/${encodeURIComponent(id)}`);
}

export async function updateAgent(id: string, input: AgentInput): Promise<Agent> {
  await request(`/api/agents/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
  return getAgent(id);
}

export async function removeAgent(id: string): Promise<void> {
  await request<void>(`/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" });
}
