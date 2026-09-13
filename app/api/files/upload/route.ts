import { proxyFileRequest } from "../_lib/proxy";

export function POST(request: Request) {
  return proxyFileRequest(request, "/api/files/upload");
}
