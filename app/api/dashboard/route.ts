import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";

export async function GET() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return Response.json({ error: "ยังไม่ได้กำหนดค่า API_URL" }, { status: 503, headers: { "cache-control": "no-store" } });
  const session = (await cookies()).get("__Host-session");
  if (!session) return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401, headers: { "cache-control": "no-store" } });
  try {
    const upstream = await fetch(`${apiUrl}/api/dashboard/`, { headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const payload = await upstream.json().catch(() => ({ error: "ไม่สามารถอ่านข้อมูล Dashboard ได้" }));
    return Response.json(payload, { status: upstream.status, headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้" }, { status: 502, headers: { "cache-control": "no-store" } }); }
}
