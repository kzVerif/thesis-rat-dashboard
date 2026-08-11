import "server-only";
import type { DistributionSnapshot } from "./types";

export async function getDistributionSnapshot(): Promise<DistributionSnapshot> {
  return {
    source: process.env.DISTRIBUTION_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

