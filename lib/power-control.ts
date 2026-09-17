import { z } from "zod";

export const powerTargetIdSchema = z.string().uuid();
const uuid = powerTargetIdSchema;
const base = { type: z.literal("power"), request_id: uuid };

export type PowerShutdownRequest = {
  type: "power"; action: "shutdown"; agent_id: string; request_id: string;
};
export type PowerRoomShutdownRequest = {
  type: "power"; action: "shutdown_room"; room_id: string; request_id: string;
};
export type PowerRequest = PowerShutdownRequest | PowerRoomShutdownRequest;

export const powerShutdownResultSchema = z.object({
  ...base, action: z.literal("shutdown_result"), agent_id: uuid,
  success: z.boolean(), mode: z.string(), message: z.string(), code: z.string().optional(),
});
export const powerRoomShutdownResultSchema = z.object({
  ...base, action: z.literal("shutdown_room_result"), room_id: uuid,
  total: z.number().int().nonnegative(), online: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(), accepted: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(), timeout: z.number().int().nonnegative(),
}).refine((value) =>
  value.total === value.online + value.offline &&
  value.online === value.accepted + value.failed + value.timeout,
);
export const powerErrorResponseSchema = z.object({
  type: z.literal("error"), stream: z.literal("power"),
  action: z.enum(["shutdown", "shutdown_room"]), request_id: uuid,
  agent_id: z.union([uuid, z.literal("")]), room_id: z.union([uuid, z.literal("")]),
  code: z.string(), error: z.string(),
});

export type PowerShutdownResult = z.infer<typeof powerShutdownResultSchema>;
export type PowerRoomShutdownResult = z.infer<typeof powerRoomShutdownResultSchema>;
export type PowerErrorResponse = z.infer<typeof powerErrorResponseSchema>;
export type PowerResult = PowerShutdownResult | PowerRoomShutdownResult;
export type PowerPhase = "idle" | "connecting" | "pending" | "success" | "failure";

const errorMessages: Record<string, string> = {
  invalid_request: "ข้อมูลคำสั่งไม่ถูกต้อง กรุณาลองใหม่",
  forbidden: "คุณไม่มีสิทธิ์ควบคุม Agent",
  authorization_unavailable: "ไม่สามารถตรวจสอบสิทธิ์ได้ในขณะนี้",
  agent_not_found: "ไม่พบ Agent",
  agent_offline: "Agent เครื่องนี้ออฟไลน์อยู่",
  room_not_found: "ไม่พบห้องที่ต้องการ",
  lookup_failed: "ไม่สามารถอ่านข้อมูลเป้าหมายได้",
  duplicate_request: "มีคำสั่งนี้กำลังดำเนินการอยู่",
  timeout: "Agent ไม่ตอบกลับภายในเวลาที่กำหนด ยังไม่สามารถยืนยันผลคำสั่งได้",
  send_failed: "ไม่สามารถส่งคำสั่งปิดเครื่องไปยัง Agent ได้",
  execution_failed: "Agent ไม่ยอมรับคำสั่งปิดเครื่อง",
  communication_timeout: "หมดเวลารอการตอบกลับจากระบบ ยังไม่สามารถยืนยันผลคำสั่งได้",
  connection_error: "การเชื่อมต่อขัดข้อง ยังไม่สามารถยืนยันผลคำสั่งได้ กรุณาตรวจสอบการเชื่อมต่อและเซสชัน",
  connection_closed: "การเชื่อมต่อถูกปิดก่อนรับผล กรุณาตรวจสอบการเชื่อมต่อหรือเข้าสู่ระบบใหม่",
  cancelled: "หยุดรอผลคำสั่งแล้ว",
};

export function getPowerErrorMessage(code?: string) {
  return (code && Object.hasOwn(errorMessages, code) ? errorMessages[code] : undefined)
    ?? "เกิดข้อผิดพลาดในการส่งคำสั่ง";
}

export class PowerControlError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(getPowerErrorMessage(code));
    this.name = "PowerControlError";
    this.code = code;
  }
}

export function canShutdownAgent(status: string) {
  // WARNING is not a live connection guarantee; existing AV controls also require ONLINE.
  return status === "ONLINE";
}
