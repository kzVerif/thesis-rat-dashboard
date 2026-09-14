import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { tokenErrorMessage } from "@/app/(system)/tokens/_lib/types";

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const method = request.method;
  const allowed = path.length === 0 ? ["GET", "POST"] : path.length === 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[0]) ? ["GET", "PUT", "PATCH", "DELETE"] : [];
  const headers = { "Cache-Control": "no-store" };
  if (!allowed.length) return Response.json({ error: "ไม่พบเส้นทาง Tokens" }, { status: 404, headers });
  if (!allowed.includes(method)) return Response.json({ error: "ไม่รองรับคำสั่งนี้" }, { status: 405, headers: { ...headers, Allow: allowed.join(", ") } });
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" }, { status: 403, headers });
  }
  const apiUrl = getApiUrl();
  if (!apiUrl) return Response.json({ error: "ยังไม่ได้กำหนดค่า API_URL" }, { status: 503, headers });
  const session = (await cookies()).get("__Host-session");
  if (!session) return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401, headers });
  try {
    const upstream = await fetch(`${apiUrl}/api/tokens${path.length ? `/${encodeURIComponent(path[0])}` : ""}`, {
      method, headers: { cookie: `${session.name}=${session.value}`, ...(method === "POST" || method === "PUT" || method === "PATCH" ? { "Content-Type": "application/json" } : {}) },
      body: method === "GET" || method === "DELETE" ? undefined : await request.text(),
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(30000),
    });
    const payload: unknown = await upstream.json().catch(() => null);
    // Never forward backend SQL, arguments or other diagnostic fields to the browser.
    if (!upstream.ok) {
      const valid = payload && typeof payload === "object" && "valid" in payload && payload.valid === false;
      return Response.json({ error: valid && "error" in payload ? payload.error : tokenErrorMessage(upstream.status, payload), ...(valid ? { valid: false } : {}) }, { status: upstream.status >= 300 && upstream.status < 400 ? 502 : upstream.status, headers });
    }
    return Response.json(payload, { status: upstream.status, headers });
  } catch { return Response.json({ error: "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้" }, { status: 502, headers }); }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
