"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRoom, removeRoom, updateRoom } from "@/app/(system)/rooms/_lib/room-server";
import type { Room, RoomActionResult } from "@/app/(system)/rooms/_lib/types";

const roomSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อห้อง").max(100, "ชื่อห้องต้องไม่เกิน 100 ตัวอักษร"),
  description: z.string().trim().transform((value) => value || null),
});
const idSchema = z.string().uuid("รหัสห้องไม่ถูกต้อง");

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาดจากระบบหลังบ้าน";
}

export async function createRoomAction(input: { name: string; description: string }): Promise<RoomActionResult<Room>> {
  try {
    const room = await createRoom(roomSchema.parse(input));
    revalidatePath("/rooms");
    return { ok: true, data: room };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function updateRoomAction(input: { id: string; name: string; description: string }): Promise<RoomActionResult<Room>> {
  try {
    const id = idSchema.parse(input.id);
    const room = await updateRoom(id, roomSchema.parse(input));
    revalidatePath("/rooms");
    return { ok: true, data: room };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteRoomAction(idInput: string): Promise<RoomActionResult> {
  try {
    await removeRoom(idSchema.parse(idInput));
    revalidatePath("/rooms");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
