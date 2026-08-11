"use client";

import { ShutDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Room } from "../_lib/types";

export default function ShutdownRoomDialog({ room, onOpenChange, onConfirm }: {
  room: Room | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={room !== null} onOpenChange={onOpenChange}>
      <DialogContent className="font-kanit sm:max-w-md">
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <HugeiconsIcon icon={ShutDownIcon} className="size-6" />
          </span>
          <DialogTitle>ยืนยันการปิดเครื่องทั้งหมด</DialogTitle>
          <DialogDescription>คำสั่งนี้จะส่งไปยังคอมพิวเตอร์ทุกเครื่องภายใน “{room?.name}”</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <Detail label="Agents ทั้งหมด" value={room?.agent_count ?? 0} />
          <Detail label="ออนไลน์" value={room?.online_agent_count ?? 0} />
          <Detail label="ออฟไลน์" value={room?.offline_agent_count ?? 0} />
        </div>
        <p className="text-xs leading-5 text-slate-500">ขณะนี้เป็นหน้าจอ Mockup เท่านั้น ยังไม่มีการส่งคำสั่งไปยังระบบหลังบ้าน</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button type="button" variant="destructive" onClick={onConfirm}><HugeiconsIcon icon={ShutDownIcon} className="mr-1 size-4" />ยืนยันปิดเครื่องทั้งหมด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-red-600 dark:text-red-400">{label}</span><span className="font-semibold text-red-800 dark:text-red-200">{value} เครื่อง</span></div>;
}
