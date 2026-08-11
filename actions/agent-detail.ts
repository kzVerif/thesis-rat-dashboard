"use server";

import {
  getAgentDetail,
  shutdownAgent,
  stopAgentProcess,
} from "@/app/(system)/agents/[id]/_lib/agent-server";
import type {
  AgentCommandResult,
  AgentDetail,
} from "@/app/(system)/agents/[id]/_lib/types";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถติดต่อระบบหลังบ้านได้";
}

export async function refreshAgentAction(
  id: string
): Promise<AgentCommandResult<AgentDetail>> {
  try {
    return { ok: true, data: await getAgentDetail(id) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function stopAgentProcessAction(
  id: string,
  pid: number
): Promise<AgentCommandResult> {
  try {
    await stopAgentProcess(id, pid);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function shutdownAgentAction(
  id: string
): Promise<AgentCommandResult> {
  try {
    await shutdownAgent(id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

