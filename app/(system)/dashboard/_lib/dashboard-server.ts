import "server-only";
import type { DashboardSnapshot } from "./types";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return {
    source: process.env.DASHBOARD_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

