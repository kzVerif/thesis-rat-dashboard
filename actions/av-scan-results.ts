"use server";

import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/auth";
import { avScanResultsSchema, resultJobs, type AvScanResult } from "@/lib/av-scan-results";

export async function loadAvScanResults() {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error("ยังไม่ได้กำหนดค่า API_URL");
    const session = (await cookies()).get("__Host-session");
    if (!session) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    const rows = new Map<string, AvScanResult>();
    let totalPages = 1;
    let total: number | undefined;
    for (let page = 1; page <= totalPages; page++) {
      const response = await fetch(`${apiUrl}/api/av-scan-results?page=${page}&limit=100`, {
        headers: { cookie: `${session.name}=${session.value}` }, cache: "no-store", signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(response.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์อ่านผลสแกน (agents.read หรือ agents.manage)" : `โหลดผลสแกนไม่สำเร็จ (HTTP ${response.status})`);
      const parsed = avScanResultsSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("รูปแบบข้อมูลผลสแกนจาก API ไม่ถูกต้อง");
      const data = parsed.data;
      if (data.pagination.page !== page || (total !== undefined && total !== data.pagination.total)) throw new Error("ข้อมูลเปลี่ยนระหว่างโหลด กรุณากด Reload อีกครั้ง");
      total = data.pagination.total;
      totalPages = data.pagination.total_pages;
      data.av_scan_results.forEach(row => rows.set(row.id, row));
    }
    if (rows.size !== total) throw new Error("ได้รับผลสแกนไม่ครบ กรุณากด Reload อีกครั้ง");
    return { ok: true as const, jobs: resultJobs([...rows.values()]), updatedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "ไม่สามารถโหลดผลสแกนได้" };
  }
}
