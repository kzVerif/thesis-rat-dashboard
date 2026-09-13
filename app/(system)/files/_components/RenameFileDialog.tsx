"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type RenameFileDialogProps = {
  currentName: string;
  onRename: (newName: string) => Promise<boolean>;
};

export default function RenameFileDialog({
  currentName,
  onRename,
}: RenameFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  const fileNameWithoutExt = useMemo(() => {
    const lastDot = currentName.lastIndexOf(".");
    if (lastDot <= 0) return currentName;
    return currentName.slice(0, lastDot);
  }, [currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    const renamed = await onRename(trimmedName);
    setIsSaving(false);
    if (renamed) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-0 px-2 text-slate-600 dark:text-slate-300 sm:px-3">
          <HugeiconsIcon icon={Edit03Icon} className="size-4 sm:mr-1.5" />
          <span className="truncate">เปลี่ยนชื่อ</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md font-kanit">
        <DialogHeader>
          <DialogTitle>เปลี่ยนชื่อไฟล์</DialogTitle>
          <DialogDescription>
            ป้อนชื่อใหม่สำหรับไฟล์นี้และกดบันทึกเพื่อยืนยัน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-file-name">ชื่อไฟล์ใหม่</Label>
          <Input
            id="new-file-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="กรอกชื่อไฟล์ใหม่"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            คำแนะนำ: ใช้ชื่อที่สั้นและชัดเจน เช่น {fileNameWithoutExt}
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

