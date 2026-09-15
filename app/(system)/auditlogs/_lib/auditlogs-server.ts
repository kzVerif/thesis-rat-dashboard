import "server-only";
import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus, isAccessInterrupt } from "@/lib/access-control";
import { auditLogSchema, logsQuerySchema, logsResponseSchema, type AuditLogsSnapshot, type LogsQuery, type LogsResponse } from "./types";

async function request(path: string): Promise<unknown> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
  const session = (await cookies()).get("__Host-session");
  if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/logs${path}`, { headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store", signal: AbortSignal.timeout(30000) });
  } catch { throw new Error("ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้ กรุณาลองอีกครั้ง"); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const errors: Record<number, string> = { 400: "ตัวกรองหรือรหัสรายการไม่ถูกต้อง", 401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 403: "บัญชีนี้ไม่มีสิทธิ์อ่านประวัติการใช้งาน (logs.read)", 404: "ไม่พบรายการประวัติที่ต้องการ รายการอาจถูกลบตามอายุการเก็บข้อมูลแล้ว กรุณารีเฟรชรายการ", 429: "เรียกข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง", 500: "ไม่สามารถโหลดประวัติการใช้งานได้ กรุณาลองอีกครั้ง" };
    throw new Error(errors[response.status] ?? `โหลดข้อมูลไม่สำเร็จ (HTTP ${response.status})`);
  }
  return response.json();
}

export async function getAuditLogs(query: LogsQuery): Promise<LogsResponse> {
  const parsed = logsQuerySchema.safeParse(query);
  if (!parsed.success) throw new Error("กรุณาตรวจสอบ UUID ช่วงเวลา และจำนวนรายการของตัวกรอง");
  const params = new URLSearchParams();
  Object.entries(parsed.data).forEach(([key, value]) => { if (value !== "") params.set(key, String(value)); });
  const result = logsResponseSchema.safeParse(await request(`?${params}`));
  if (!result.success) throw new Error("รูปแบบข้อมูลประวัติจาก API ไม่ถูกต้อง");
  // Retention can remove the current page even when the upper time bound is fixed.
  // Return to page one once; do not loop while the cleanup worker is running.
  if (parsed.data.page > 1 && parsed.data.page > result.data.pagination.total_pages) {
    return getAuditLogs({ ...parsed.data, page: 1 });
  }
  return result.data;
}

export async function getAuditLog(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("รหัสรายการไม่ถูกต้อง");
  const result = auditLogSchema.safeParse(await request(`/${encodeURIComponent(id)}`));
  if (!result.success) throw new Error("รูปแบบรายละเอียดจาก API ไม่ถูกต้อง");
  return result.data;
}

export async function getAuditLogsSnapshot(): Promise<AuditLogsSnapshot> {
  const query: LogsQuery = { page: 1, limit: 20, user_id: "", target_agent_id: "", action: "", from: "", to: new Date().toISOString() };
  try { return { data: await getAuditLogs(query), error: null, query }; }
  catch (error) {
    if (isAccessInterrupt(error)) throw error;
    return { data: null, error: error instanceof Error ? error.message : "โหลดประวัติไม่สำเร็จ", query };
  }
}
