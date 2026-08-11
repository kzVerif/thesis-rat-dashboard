import "server-only";
import type { AuditLogsSnapshot } from "./types";

export async function getAuditLogsSnapshot(): Promise<AuditLogsSnapshot> {
  return {
    source: process.env.AUDIT_LOGS_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

