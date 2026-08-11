import { getApiUrl } from "@/lib/auth";

const allowedRoutes = new Set([
  "login",
  "logout",
  "logout-all",
  "me",
  "sessions",
  "change-password",
]);

async function proxyAuthRequest(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((origin && origin !== new URL(request.url).origin) || fetchSite === "cross-site") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return Response.json({ error: "ยังไม่ได้กำหนด API_URL" }, { status: 503 });
  }

  const { path } = await context.params;
  const route = path.join("/");
  const validRoute = allowedRoutes.has(route) || /^sessions\/[^/]+$/.test(route);
  if (!validRoute) return Response.json({ error: "not_found" }, { status: 404 });

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (contentType) headers.set("content-type", contentType);
  if (cookie) headers.set("cookie", cookie);
  if (userAgent) headers.set("user-agent", userAgent);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  try {
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
    const upstream = await fetch(`${apiUrl}/api/auth/${route}`, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    const setCookie = upstream.headers.get("set-cookie");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);
    if (setCookie) responseHeaders.set("set-cookie", setCookie);
    responseHeaders.set("cache-control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Unable to reach auth backend:", error);
    return Response.json(
      { error: "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้" },
      { status: 502 },
    );
  }
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
