"use client";

import { ShutDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePowerCommand } from "@/hooks/use-power-command";
import { shutdownRoom } from "@/lib/power-control-client";
import type { PowerRoomShutdownResult } from "@/lib/power-control";
import type { Room } from "../_lib/types";

export default function ShutdownRoomDialog({ room, onOpenChange }: {
  room: Room;
  onOpenChange: (open: boolean) => void;
}) {
  const command = usePowerCommand<PowerRoomShutdownResult>();
  const result = command.result;
  const summary = result
    ? result.total === 0 ? "ไม่พบ Agent ในห้อง"
      : result.online === 0 ? "ไม่มี Agent ออนไลน์ขณะส่งคำสั่ง"
      : result.failed > 0 || result.timeout > 0 ? "ได้รับผลคำสั่งแล้ว มี Agent ที่ไม่ยอมรับคำสั่งหรือไม่ตอบกลับ"
      : "Agent ออนไลน์ทั้งหมด ยอมรับคำสั่งแล้ว"
    : null;

  async function confirm() {
    if (room.online_agent_count === 0 || result) return;
    const response = await command.run((signal, onPending) => shutdownRoom(room.id, { signal, onPending }));
    if (!response) return;
    const description = room.name + " • ยอมรับคำสั่ง " + response.accepted + " • ล้มเหลว " + response.failed + " • หมดเวลา " + response.timeout;
    if (response.failed > 0 || response.timeout > 0) toast.warning("คำสั่งบางส่วนไม่สำเร็จหรือยังยืนยันผลไม่ได้", { description });
    else if (response.accepted > 0) toast.success("ส่งคำสั่ง Shutdown ห้องสำเร็จ", { description });
    else toast.info("ไม่มี Agent ออนไลน์รับคำสั่ง", { description });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!command.pending) onOpenChange(open); }}>
      <DialogContent className="font-kanit sm:max-w-md" showCloseButton={!command.pending}>
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <HugeiconsIcon icon={ShutDownIcon} className="size-6" />
          </span>
          <DialogTitle>{result ? "ผลคำสั่งปิดเครื่องทั้งห้อง" : "ยืนยันการปิดเครื่องทั้งหมด"}</DialogTitle>
          <DialogDescription>ส่งคำสั่งไปยังคอมพิวเตอร์ที่ออนไลน์ภายใน “{room.name}”</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <Detail label="Agents ทั้งหมด" value={result?.total ?? room.agent_count} />
          <Detail label="ออนไลน์" value={result?.online ?? room.online_agent_count} />
          <Detail label="ออฟไลน์" value={result?.offline ?? room.offline_agent_count} />
          {result && <>
            <Detail label="ยอมรับคำสั่ง" value={result.accepted} />
            <Detail label="ล้มเหลว" value={result.failed} />
            <Detail label="หมดเวลา" value={result.timeout} />
          </>}
        </div>
        <p className="text-xs leading-5 text-amber-600">คำสั่งนี้อาจปิดเครื่องจริง ขึ้นอยู่กับโหมด Power ของ Agent แต่ละเครื่อง</p>
        <p className="text-xs text-slate-500">{result ? "จำนวนและผลคำสั่งจากระบบขณะส่งคำสั่ง" : "จำนวนจากการโหลดข้อมูลล่าสุด อาจต่างจากสถานะขณะส่งคำสั่ง"}</p>
        <div aria-live="polite">
          {command.pending && <p role="status">{command.phase === "connecting" ? "กำลังเชื่อมต่อ..." : "กำลังรอผลรวมจากระบบ..."}</p>}
          {command.error && <p role="alert" className="text-sm text-red-600">{command.error}</p>}
          {summary && <p role="status" className="text-sm">{summary}</p>}
          {result && result.timeout > 0 && <p className="text-xs text-slate-500">หมดเวลา: Agent ไม่ตอบกลับ ยังไม่สามารถยืนยันผลคำสั่งได้</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={command.pending} onClick={() => onOpenChange(false)}>{result ? "ปิด" : "ยกเลิก"}</Button>
          {!result && <Button type="button" variant="destructive" disabled={command.pending || room.online_agent_count === 0} onClick={confirm}>
            <HugeiconsIcon icon={ShutDownIcon} className="mr-1 size-4" />{command.pending ? "กำลังดำเนินการ..." : "ยืนยันปิดเครื่องทั้งหมด"}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-red-600 dark:text-red-400">{label}</span><span className="font-semibold text-red-800 dark:text-red-200">{value} เครื่อง</span></div>;
}
