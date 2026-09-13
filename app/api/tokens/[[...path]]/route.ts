// app/api/tokens/[[...path]]/route.ts
const getApiUrl = () => process.env.API_URL ?? "http://localhost:8080";

async function proxy(req: Request) {
  const apiUrl = getApiUrl();
  const url = new URL(req.url);
  const basePath = url.pathname.replace(/^\/api\/tokens/, "") || "";
  const upstream = `${apiUrl}/api/tokens${basePath}${url.search}`;

  const headers = new Headers();
  for (const [k, v] of req.headers) {
    if (k.toLowerCase() === "host") continue;
    headers.set(k, v as string);
  }
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  // remove problematic headers so fetch computes content-length correctly
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("content-encoding");

  const bodyArray = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    body: bodyArray && bodyArray.byteLength ? bodyArray : undefined,
  };

  const upstreamRes = await fetch(upstream, init);
  const resHeaders = new Headers(upstreamRes.headers);
  resHeaders.delete("transfer-encoding");

  const body = await upstreamRes.arrayBuffer();
  return new Response(body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export const GET = async (req: Request) => proxy(req);
export const POST = async (req: Request) => proxy(req);
export const PUT = async (req: Request) => proxy(req);
export const DELETE = async (req: Request) => proxy(req);
export const PATCH = async (req: Request) => proxy(req);