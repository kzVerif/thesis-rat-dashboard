import "server-only";
import type { FilesSnapshot } from "./types";

export async function getFilesSnapshot(): Promise<FilesSnapshot> {
  return {
    source: process.env.FILES_API_URL ? "backend" : "mock",
    loadedAt: new Date().toISOString(),
  };
}

