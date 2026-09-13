import "server-only";

import { revalidatePath } from "next/cache";

function revalidate(paths: string[]) {
  for (const path of new Set(paths)) revalidatePath(path);
}

export function revalidateAgentPaths(agentId?: string) {
  revalidate(["/agents", "/dashboard", "/rooms", "/distribute-files", ...(agentId ? [`/agents/${agentId}`] : [])]);
}

export function revalidateRoomPaths() {
  revalidate(["/rooms", "/agents", "/distribute-files", "/dashboard"]);
}

export function revalidateUserPaths() {
  revalidate(["/users", "/settings"]);
}

export function revalidateRolePaths() {
  revalidate(["/permissions", "/users"]);
}

export function revalidateFilePaths() {
  revalidate(["/files", "/distribute-files"]);
}

export function revalidateDistributionPaths(jobId?: string) {
  revalidate(["/file-distributions", ...(jobId ? [`/file-distributions/${jobId}`] : [])]);
}
