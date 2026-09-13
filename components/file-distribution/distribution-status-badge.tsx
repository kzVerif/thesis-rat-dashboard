import { Badge } from "@/components/ui/badge";
import type { DistributionJobStatus, DistributionTargetStatus } from "@/lib/file-distribution";

type Status = DistributionJobStatus | DistributionTargetStatus;

const descriptions: Record<Status, string> = {
  PENDING: "รอส่งคำสั่ง", SENT: "ส่งคำสั่งแล้ว", DOWNLOADING: "กำลังดาวน์โหลด",
  VERIFYING: "กำลังตรวจสอบไฟล์", COMPLETED: "สำเร็จ", FAILED: "ไม่สำเร็จ",
  OFFLINE: "Agent ไม่ได้เชื่อมต่อ", CANCELLED: "ถูกยกเลิก", IN_PROGRESS: "กำลังดำเนินการ",
  PARTIAL_FAILED: "สำเร็จบางส่วน",
};

const labels: Record<Status, string> = {
  PENDING: "รอดำเนินการ", SENT: "ส่งคำสั่งแล้ว", DOWNLOADING: "กำลังดาวน์โหลด", VERIFYING: "กำลังตรวจสอบ",
  COMPLETED: "สำเร็จ", FAILED: "ไม่สำเร็จ", OFFLINE: "ออฟไลน์", CANCELLED: "ยกเลิกแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ", PARTIAL_FAILED: "สำเร็จบางส่วน",
};

export function DistributionStatusBadge({ status }: { status: Status }) {
  const color = status === "FAILED" || status === "PARTIAL_FAILED" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" : status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : status === "OFFLINE" || status === "CANCELLED" ? "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
  return <Badge variant="outline" title={descriptions[status]} className={`whitespace-nowrap font-medium ${color}`}>{labels[status]}</Badge>;
}
