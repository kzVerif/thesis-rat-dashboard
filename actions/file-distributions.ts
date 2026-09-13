"use server";

import { getFileDistribution } from "@/app/(system)/file-distributions/_lib/file-distributions-server";
import { revalidateDistributionPaths } from "@/lib/revalidation";

export async function refreshFileDistributionAction(jobId: string) {
  try { return { ok: true as const, data: await getFileDistribution(jobId) }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "ไม่สามารถโหลดสถานะล่าสุดได้" }; }
}

export async function revalidateFileDistributionAction(jobId: string) {
  revalidateDistributionPaths(jobId);
}
