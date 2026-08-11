import "server-only";

import { cookies } from "next/headers";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
};

export type AuthSession = {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  current: boolean;
};

export function getApiUrl() {
  return process.env.API_URL?.replace(/\/$/, "");
}

async function authFetch(path: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const session = (await cookies()).get("__Host-session");
  if (!session) return null;

  try {
    return await fetch(`${apiUrl}${path}`, {
      headers: { cookie: `${session.name}=${session.value}` },
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Auth request failed (${path}):`, error);
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await authFetch("/api/auth/me");
  if (!response?.ok) return null;

  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return null;
  const user = data as Partial<AuthUser>;
  if (!user.id || !user.username || !user.email || !user.role) return null;
  return user as AuthUser;
}

export async function getAuthSessions(): Promise<AuthSession[]> {
  const response = await authFetch("/api/auth/sessions");
  if (!response?.ok) return [];
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return [];
  const sessions = (data as { sessions?: unknown }).sessions;
  return Array.isArray(sessions) ? (sessions as AuthSession[]) : [];
}
