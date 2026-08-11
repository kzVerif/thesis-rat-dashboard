import "server-only";
import type { TokensSnapshot } from "./types";

export async function getTokensSnapshot(): Promise<TokensSnapshot> {
  return {
    source: process.env.TOKENS_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

