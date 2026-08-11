"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createUser, removeUser, updateUser } from "@/app/(system)/users/_lib/users-server";
import type { User, UserActionResult } from "@/app/(system)/users/_lib/types";

const baseSchema = z.object({
  username: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้").max(50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร"),
  email: z.string().trim().max(255).refine((value) => !value || z.email().safeParse(value).success, "รูปแบบอีเมลไม่ถูกต้อง").transform((value) => value || null),
  display_name: z.string().trim().max(100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร").transform((value) => value || null),
  role_id: z.string().uuid("Role ID ต้องเป็น UUID"),
  status: z.enum(["ACTIVE", "DISABLED", "LOCKED"]),
});
const idSchema = z.string().uuid("รหัสผู้ใช้ไม่ถูกต้อง");

function message(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาดจากระบบหลังบ้าน";
}

export async function createUserAction(input: Record<string, string>): Promise<UserActionResult<User>> {
  try {
    const data = baseSchema.extend({ password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร") }).parse(input);
    const user = await createUser(data);
    revalidatePath("/users");
    return { ok: true, data: user };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function updateUserAction(input: Record<string, string>): Promise<UserActionResult<User>> {
  try {
    const id = idSchema.parse(input.id);
    const data = baseSchema.extend({ password: z.string().refine((value) => !value || value.length >= 8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").optional() }).parse(input);
    const user = await updateUser(id, { ...data, password: data.password || undefined });
    revalidatePath("/users");
    return { ok: true, data: user };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function deleteUserAction(idInput: string): Promise<UserActionResult> {
  try {
    await removeUser(idSchema.parse(idInput));
    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: message(error) }; }
}
