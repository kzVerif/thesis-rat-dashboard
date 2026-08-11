import "server-only";
import type { ScreensSnapshot } from "./types";

export async function getScreensSnapshot(): Promise<ScreensSnapshot> {
  return {
    source: process.env.SCREENS_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

