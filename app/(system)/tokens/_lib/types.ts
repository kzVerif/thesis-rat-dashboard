import { z } from "zod";

export const tokenSchema = z.object({
  id: z.string(), token: z.string().optional(), token_type: z.string().optional(),
  creator_username: z.string().optional(), created_by: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(), agent_id: z.string().nullable().optional(),
  max_use: z.number().int().nullable().optional(), used_count: z.number().int(),
  expires_at: z.string().nullable().optional(), is_revoked: z.boolean(), created_at: z.string(), updated_at: z.string().optional(),
});
export const tokensSchema = z.object({ tokens: z.array(tokenSchema), pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), total_pages: z.number() }).optional() });
export const createdTokenSchema = tokenSchema.extend({ token: z.string() });
export type Token = z.infer<typeof tokenSchema>;
export type CreateTokenInput = { max_use?: number | null; expires_at?: string | null };
export type UpdateTokenInput = { max_use?: number | null; expires_at?: string | null };
export type TokensSnapshot = { tokens: Token[]; error: string | null };

export function getTokenStatus(token: Token, now = Date.now()) {
  if (token.is_revoked) return { label: "เพิกถอนแล้ว", tone: "red" } as const;
  if (token.expires_at && Date.parse(token.expires_at) < now) return { label: "หมดอายุ", tone: "red" } as const;
  if (token.max_use != null && token.used_count >= token.max_use) return { label: "ใช้ครบแล้ว", tone: "amber" } as const;
  return { label: "พร้อมใช้งาน", tone: "green" } as const;
}

export function tokenErrorMessage(status: number, payload: unknown): string {
  const error = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
  const messages: Record<string, string> = {
    "token not found": "ไม่พบ Token", "token revoked": "Token ถูกเพิกถอนแล้ว",
    "token expired": "Token หมดอายุแล้ว", "token use limit exceeded": "Token ใช้ครบจำนวนครั้งที่กำหนดแล้ว",
  };
  if (typeof error === "string" && messages[error]) return messages[error];
  if (status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์จัดการ Tokens (tokens.manage)";
  if (status === 429) return "เรียกข้อมูลถี่เกินไป กรุณารอสักครู่";
  if (status >= 500) return "ไม่สามารถดำเนินการกับ Tokens ได้ กรุณาลองอีกครั้ง";
  return typeof error === "string" ? error : `ดำเนินการไม่สำเร็จ (HTTP ${status})`;
}

export function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseTokenConstraints(maxUse: string, expiresAt: string) {
  const max = maxUse.trim();
  if (max && (!/^\d+$/.test(max) || !Number.isSafeInteger(Number(max)) || Number(max) < 1)) throw new Error("จำนวนครั้งต้องเป็นจำนวนเต็มบวก หรือเว้นว่างเพื่อไม่จำกัด");
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) throw new Error("วันหมดอายุไม่ถูกต้อง");
  return { max_use: max ? Number(max) : null, expires_at: expiresAt ? new Date(expiresAt).toISOString() : null };
}
