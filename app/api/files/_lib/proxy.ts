import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { revalidateFilePaths } from "@/lib/revalidation";

const errorByStatus: Record<number, string> = {
  400: "ข้อมูลไฟล์ไม่ถูกต้อง",
  401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  403: "บัญชีนี้ไม่มีสิทธิ์จัดการไฟล์",
  404: "ไม่พบไฟล์ที่ต้องการ",
  413: "ไฟล์มีขนาดเกิน 100 MiB",
  500: "ระบบหลังบ้านไม่สามารถจัดการไฟล์ได้",
};

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === new URL(request.url).origin) && fetchSite !== "cross-site";
}

export async function proxyFileRequest(request: Request, backendPath: string) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return Response.json({ error: "ยังไม่ได้กำหนด API_URL" }, { status: 503 });
  }

  const session = (await cookies()).get("__Host-session");
  if (!session) {
    return Response.json({ error: errorByStatus[401] }, { status: 401 });
  }

  const headers = new Headers({ cookie: `${session.name}=${session.value}` });
  const contentType = request.headers.get("content-type");
  const contentLength = request.headers.get("content-length");
  if (contentType) headers.set("content-type", contentType);
  if (contentLength) headers.set("content-length", contentLength);

  try {
    const upstreamRequest = new Request(`${apiUrl}${backendPath}`, {
      method: request.method,
      headers,
      body: request.body,
      // Node.js requires this option when forwarding a ReadableStream body.
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    const upstream = await fetch(upstreamRequest, { cache: "no-store" });
    if (upstream.ok && !["GET", "HEAD"].includes(request.method.toUpperCase())) {
      revalidateFilePaths();
    }
    const responseHeaders = new Headers({ "cache-control": "no-store" });
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Unable to reach files backend (${backendPath}):`, error);
    return Response.json(
      { error: "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้" },
      { status: 502 },
    );
  }
}
