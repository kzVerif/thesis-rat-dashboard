"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRole, removeRole, updateRole } from "@/app/(system)/permissions/_lib/rbac-server";
import type { ActionResult, RoleInput } from "@/app/(system)/permissions/_lib/types";

const uuid = z.string().uuid();
const roleInput = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อบทบาท").max(50, "ชื่อบทบาทยาวเกิน 50 ตัวอักษร"),
  description: z.string().trim().max(500).nullable(),
  permission_ids: z.array(uuid),
});

function failure(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดจากระบบหลังบ้าน" };
}

export async function createRoleAction(input: RoleInput): Promise<ActionResult> {
  try {
    const value = roleInput.parse(input);
    await createRole(value);
    revalidatePath("/permissions");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoleAction(id: string, input: RoleInput): Promise<ActionResult> {
  try {
    uuid.parse(id);
    const value = roleInput.parse(input);
    await updateRole(id, value);
    revalidatePath("/permissions");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  try {
    uuid.parse(id);
    await removeRole(id);
    revalidatePath("/permissions");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
