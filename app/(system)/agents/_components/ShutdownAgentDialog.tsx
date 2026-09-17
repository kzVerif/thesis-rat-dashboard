"use client";

import { ShutDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePowerCommand } from "@/hooks/use-power-command";
import { canShutdownAgent, type PowerShutdownResult } from "@/lib/power-control";
import { shutdownAgent } from "@/lib/power-control-client";
import type { Agent } from "../_lib/types";

export default function ShutdownAgentDialog({ agent, roomName, onOpenChange }: {
  agent: Pick<Agent, "id" | "hostname" | "ip_address" | "status">;
  roomName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const command = usePowerCommand<PowerShutdownResult>();

  async function confirm() {
  if (!canShutdownAgent(agent.status) || command.result) return;

  const result = await command.run((signal, onPending) =>
    shutdownAgent(agent.id, { signal, onPending })
  );

  if (result) {
    toast.success(
      result.mode === "mock"
        ? "ทดสอบคำสั่ง Shutdown สำเร็จ"
        : result.mode === "real"
          ? "ส่งคำสั่ง Shutdown จริงแล้ว"
          : "Agent ยอมรับคำสั่งแล้ว",
      {
        description:
          agent.hostname +
          (result.mode === "mock"
            ? " • โหมดทดสอบ: เครื่องจะยังไม่ถูกปิดจริง"
            : result.mode === "real"
              ? " • โหมดจริง: เครื่องกำลังปิด"
              : ` • โหมด: ${result.mode}`),
      },
    );
  }
} 

  return <Dialog open onOpenChange={(open) => { if (!command.pending) onOpenChange(open); }}>
    <DialogContent className="font-kanit sm:max-w-md" showCloseButton={!command.pending}>
      <DialogHeader>
        <DialogTitle>{command.result ? "ผลคำสั่งปิดเครื่อง" : "ยืนยันการปิดเครื่อง"}</DialogTitle>
        <DialogDescription>ส่งคำสั่งปิดเครื่องไปยัง Agent ที่เลือก</DialogDescription>
      </DialogHeader>
      <dl className="space-y-2 rounded-xl border p-4 text-sm">
        <div><dt className="text-slate-500">ชื่อเครื่อง</dt><dd>{agent.hostname}</dd></div>
        <div><dt className="text-slate-500">ห้อง</dt><dd>{roomName}</dd></div>
        <div><dt className="text-slate-500">IP</dt><dd>{agent.ip_address ?? "ไม่มีข้อมูล"}</dd></div>
      </dl>
      {!command.result && (
  <p className="text-xs text-amber-600">
    คำสั่งนี้อาจปิดเครื่องจริง ขึ้นอยู่กับโหมด Power ที่ Agent กำลังใช้งาน
  </p>
)}

{command.result?.mode === "mock" && (
  <p className="text-xs text-slate-500">
    โหมดทดสอบ (Mock): เครื่องจะยังไม่ถูกปิดจริง
  </p>
)}

{command.result?.mode === "real" && (
  <p className="text-xs text-red-600">
    โหมดจริง (Real): Agent รับคำสั่งแล้ว และเครื่องกำลังปิด
  </p>
)}
      <div aria-live="polite">
        {command.pending && <p role="status">{command.phase === "connecting" ? "กำลังเชื่อมต่อ..." : "กำลังรอผลคำสั่ง..."}</p>}
        {command.error && <p role="alert" className="text-sm text-red-600">{command.error}</p>}
        {command.result && (
  <p role="status" className="text-sm text-emerald-600">
    Agent ยอมรับคำสั่งแล้ว
    {command.result.mode === "mock"
      ? " (Mock)"
      : command.result.mode === "real"
        ? " (Real)"
        : ` (${command.result.mode})`}
  </p>
)}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={command.pending} onClick={() => onOpenChange(false)}>{command.result ? "ปิด" : "ยกเลิก"}</Button>
        {!command.result && <Button variant="destructive" disabled={command.pending || !canShutdownAgent(agent.status)} onClick={confirm}>
          <HugeiconsIcon icon={ShutDownIcon} className="size-4" />{command.pending ? "กำลังดำเนินการ..." : "ส่งคำสั่งปิดเครื่อง"}
        </Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
