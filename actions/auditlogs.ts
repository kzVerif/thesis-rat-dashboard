"use server";
import { getAuditLog, getAuditLogs } from "@/app/(system)/auditlogs/_lib/auditlogs-server";
import type { LogsQuery } from "@/app/(system)/auditlogs/_lib/types";

export async function loadAuditLogs(query: LogsQuery) {
  try { return { ok: true as const, data: await getAuditLogs(query) }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "โหลดประวัติไม่สำเร็จ" }; }
}
export async function loadAuditLog(id: string) {
  try { return { ok: true as const, data: await getAuditLog(id) }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "โหลดรายละเอียดไม่สำเร็จ" }; }
}
