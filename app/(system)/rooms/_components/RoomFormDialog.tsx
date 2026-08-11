"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Room } from "../_lib/types";

export default function RoomFormDialog({ open, onOpenChange, title, initialRoom, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialRoom?: Room;
  onSubmit: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialRoom?.name ?? "");
  const [description, setDescription] = useState(initialRoom?.description ?? "");
  const [pending, setPending] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !initialRoom) {
      setName("");
      setDescription("");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || pending) return;
    setPending(true);
    try { await onSubmit(name.trim(), description.trim()); } finally { setPending(false); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="font-kanit sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>ชื่อห้องต้องไม่เกิน 100 ตัวอักษรและต้องไม่ซ้ำกับห้องอื่น</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="room-name">ชื่อห้อง</Label><Input id="room-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="room-description">รายละเอียด</Label><Input id="room-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ไม่ระบุก็ได้" /></div>
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>ยกเลิก</Button>
            <Button type="submit" disabled={!name.trim() || pending} className="bg-blue-600 text-white hover:bg-blue-700">{pending ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
