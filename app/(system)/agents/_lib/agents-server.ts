import "server-only";
import type { AgentsPageSnapshot } from "./types";

export async function getAgentsPageSnapshot(): Promise<AgentsPageSnapshot> {
  return {
    source: process.env.AGENTS_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

