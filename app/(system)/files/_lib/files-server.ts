import "server-only";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { interruptForApiStatus } from "@/lib/access-control";
import type { FilesResponse } from "./types";

const errorByStatus: Record<number, string> = {
  400: "ค่าการแบ่งหน้าไม่ถูกต้อง",
  401: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  403: "บัญชีนี้ไม่มีสิทธิ์จัดการไฟล์",
  500: "ระบบหลังบ้านไม่สามารถอ่านรายการไฟล์ได้",
};

export async function getFiles(page = 1, limit = 20): Promise<FilesResponse> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");

  const session = (await cookies()).get("__Host-session");
  if (!session) throw new Error(errorByStatus[401]);

  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/files/?${query}`, {
      headers: { cookie: `${session.name}=${session.value}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) interruptForApiStatus(response.status);
    const payload: unknown = await response.json().catch(() => null);
    const apiError = payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(
      typeof apiError === "string"
        ? apiError
        : errorByStatus[response.status] || `Backend returned HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<FilesResponse>;
}
