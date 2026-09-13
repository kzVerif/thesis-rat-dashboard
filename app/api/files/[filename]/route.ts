import { proxyFileRequest } from "../_lib/proxy";

type Context = { params: Promise<{ filename: string }> };

async function proxy(request: Request, context: Context) {
  const { filename } = await context.params;
  return proxyFileRequest(
    request,
    `/api/files/${encodeURIComponent(filename)}`,
  );
}

export const PATCH = proxy;
export const DELETE = proxy;
