"use server";

import { z } from "zod";
import { revalidateUserPaths } from "@/lib/revalidation";

const registerSchema = z
  .object({
    username: z.string().trim().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
    fullname: z.string().trim().min(3, "กรุณากรอกชื่อ-นามสกุล"),
    email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(8, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type RegisterField =
  | "username"
  | "fullname"
  | "email"
  | "password"
  | "confirmPassword";

export type RegisterState = {
  success: boolean;
  message: string;
  errors?: Partial<Record<RegisterField, string[]>>;
};

function getResponseMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;

  const body = data as Record<string, unknown>;
  for (const key of ["message", "error", "detail"]) {
    if (typeof body[key] === "string" && body[key].trim()) {
      return body[key];
    }
  }

  return undefined;
}

export async function registerUser(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const validation = registerSchema.safeParse({
    username: formData.get("username"),
    fullname: formData.get("fullname"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validation.success) {
    return {
      success: false,
      message: "กรุณาตรวจสอบข้อมูลที่กรอก",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const apiUrl = process.env.API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    return {
      success: false,
      message: "ยังไม่ได้กำหนดค่า API_URL ใน environment",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validation.data),
      cache: "no-store",
    });

    const data: unknown = await response.json().catch(() => null);
    const responseMessage = getResponseMessage(data);

    if (!response.ok) {
      return {
        success: false,
        message: responseMessage ?? `ส่งคำขอไม่สำเร็จ (${response.status})`,
      };
    }

    revalidateUserPaths();

    return {
      success: true,
      message: "ส่งคำขอสมัครบัญชีเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("Unable to create user:", error);
    return {
      success: false,
      message: "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
}
