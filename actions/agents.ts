"use server";

import { z } from "zod";
import { revalidateAgentPaths } from "@/lib/revalidation";
import { removeAgent, updateAgent } from "@/app/(system)/agents/_lib/agents-server";
import type { Agent, AgentActionResult, AgentInput } from "@/app/(system)/agents/_lib/types";

const nullableUuid = z.union([z.string().uuid("รหัสห้องต้องเป็น UUID"), z.null()]);
const nullableDate = z.union([z.iso.datetime({ offset: true }), z.null()]);
const schema = z.object({
  room_id: nullableUuid,
  hostname: z.string().trim().min(1, "กรุณาระบุชื่อ Agent").max(255),
  os_info: z.record(z.string(), z.unknown()).nullable(),
  mac_address: z.union([z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, "รูปแบบ MAC address ไม่ถูกต้อง"), z.null()]),
  ip_address: z.union([z.ipv4(), z.ipv6(), z.null()]),
  status: z.enum(["ONLINE", "OFFLINE", "WARNING", "DISABLED"]),
  last_seen: nullableDate,
  enrolled_at: nullableDate,
});
const idSchema = z.string().uuid("รหัส Agent ไม่ถูกต้อง");

function failure<T = undefined>(error: unknown): AgentActionResult<T> {
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  return { ok: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดจากระบบหลังบ้าน" };
}

export async function updateAgentAction(id: string, input: AgentInput): Promise<AgentActionResult<Agent>> {
  try {
    const agent = await updateAgent(idSchema.parse(id), schema.parse(input));
    revalidateAgentPaths(agent.id);
    return { ok: true, data: agent };
  } catch (error) { return failure<Agent>(error); }
}

export async function deleteAgentAction(id: string): Promise<AgentActionResult> {
  try {
    await removeAgent(idSchema.parse(id));
    revalidateAgentPaths(id);
    return { ok: true, data: undefined };
  } catch (error) { return failure(error); }
}
