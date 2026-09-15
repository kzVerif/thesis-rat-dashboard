import "server-only";
import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus, isAccessInterrupt } from "@/lib/access-control";
import { tokensSchema, tokenErrorMessage, type TokensSnapshot } from "./types";

export async function getTokensSnapshot(): Promise<TokensSnapshot> {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
    const session = (await cookies()).get("__Host-session");
    if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    const response = await fetch(`${apiUrl}/api/tokens`, { headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(tokenErrorMessage(response.status, payload));
    const parsed = tokensSchema.safeParse(payload);
    if (!parsed.success) throw new Error("รูปแบบข้อมูล Tokens จาก API ไม่ถูกต้อง");
    return { tokens: parsed.data.tokens, error: null };
  } catch (error) {
    if (isAccessInterrupt(error)) throw error;
    return { tokens: [], error: error instanceof Error ? error.message : "โหลด Tokens ไม่สำเร็จ" };
  }
}
