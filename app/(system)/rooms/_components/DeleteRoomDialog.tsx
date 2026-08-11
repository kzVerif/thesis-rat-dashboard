"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Room } from "../_lib/types";

export default function DeleteRoomDialog({ room, onOpenChange, onConfirm }: { room: Room | null; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  async function confirm() { if (pending) return; setPending(true); try { await onConfirm(); } finally { setPending(false); } }
  return (
    <Dialog open={room !== null} onOpenChange={onOpenChange}>
      <DialogContent className="font-kanit sm:max-w-md">
        <DialogHeader><DialogTitle>ยืนยันการลบห้อง</DialogTitle><DialogDescription>คุณกำลังจะลบ “{room?.name}” การดำเนินการนี้ไม่สามารถย้อนกลับได้</DialogDescription></DialogHeader>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Agent ที่อ้างอิงห้องนี้จะถูกเปลี่ยนเป็นสถานะยังไม่จัดห้องโดยอัตโนมัติ</p>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button><Button type="button" variant="destructive" onClick={confirm} disabled={pending}>{pending ? "กำลังลบ..." : "ยืนยันลบห้อง"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
