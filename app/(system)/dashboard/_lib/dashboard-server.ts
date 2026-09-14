import "server-only";
import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { dashboardSchema, type DashboardSnapshot } from "./types";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
    const session = (await cookies()).get("__Host-session");
    if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    const response = await fetch(`${apiUrl}/api/dashboard/`, { headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "ไม่สามารถโหลดข้อมูล Dashboard ได้");
    const parsed = dashboardSchema.safeParse(payload);
    if (!parsed.success) throw new Error("รูปแบบข้อมูล Dashboard จาก API ไม่ถูกต้อง");
    return { data: parsed.data, error: null };
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : "โหลด Dashboard ไม่สำเร็จ" }; }
}
