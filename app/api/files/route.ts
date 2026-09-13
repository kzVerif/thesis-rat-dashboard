import { proxyFileRequest } from "./_lib/proxy";

export function GET(request: Request) {
  const url = new URL(request.url);
  const query = new URLSearchParams();
  if (url.searchParams.has("page")) query.set("page", url.searchParams.get("page")!);
  if (url.searchParams.has("limit")) query.set("limit", url.searchParams.get("limit")!);
  const suffix = query.size ? `?${query}` : "";
  return proxyFileRequest(request, `/api/files/${suffix}`);
}
