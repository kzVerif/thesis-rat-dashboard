// app/(system)/tokens/_lib/tokensClient.ts
type Token = {
  id: string;
  token: string;
  token_type: string;
  max_use: number;
  used_count: number;
  is_revoked: boolean;
  created_at: string;
};

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listTokens(): Promise<{ tokens: Token[] }> {
  return fetchJson("/api/tokens", { method: "GET" });
}

export async function createToken(payload: { token_type?: string; max_use?: number; expires_at?: string }) {
  return fetchJson("/api/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateToken(id: string, payload: { max_use?: number; expires_at?: string }) {
  return fetchJson(`/api/tokens/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function revokeToken(id: string) {
  return fetchJson(`/api/tokens/${id}`, { method: "DELETE" });
}