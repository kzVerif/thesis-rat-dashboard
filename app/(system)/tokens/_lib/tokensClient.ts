import { z } from "zod";
import { createdTokenSchema, tokenSchema, tokensSchema, tokenErrorMessage, type CreateTokenInput, type UpdateTokenInput } from "./types";

async function fetchJson(path: string, method = "GET", body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/tokens${path}`, {
      method, credentials: "include", cache: "no-store",
      ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
  } catch { throw new Error("ไม่สามารถเชื่อมต่อได้ หากเพิ่งส่งคำสั่ง กรุณารีเฟรชเพื่อตรวจสอบผลก่อนลองซ้ำ"); }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(tokenErrorMessage(response.status, data));
  return data;
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error("รูปแบบข้อมูล Tokens จาก API ไม่ถูกต้อง กรุณารีเฟรชเพื่อตรวจสอบผล");
  return result.data;
}
export async function listTokens() { return parse(tokensSchema, await fetchJson("")); }
export async function getToken(id: string) { return parse(tokenSchema, await fetchJson(`/${encodeURIComponent(id)}`)); }
export async function createToken(payload: CreateTokenInput = {}) { return parse(createdTokenSchema, await fetchJson("", "POST", payload)); }
export async function updateToken(id: string, payload: UpdateTokenInput) {
  return parse(z.object({ message: z.literal("updated") }), await fetchJson(`/${encodeURIComponent(id)}`, "PATCH", payload));
}
export async function deleteToken(id: string) {
  return parse(z.object({ message: z.literal("revoked") }), await fetchJson(`/${encodeURIComponent(id)}`, "DELETE"));
}
