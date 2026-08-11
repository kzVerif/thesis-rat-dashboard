import "server-only";
import type { HomeSnapshot } from "./types";

export async function getHomeSnapshot(): Promise<HomeSnapshot> {
  return {
    source: process.env.HOME_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

