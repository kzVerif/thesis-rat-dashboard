"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type DeleteFileDialogProps = {
  fileName: string;
  onDelete: () => Promise<boolean>;
};

export default function DeleteFileDialog({
  fileName,
  onDelete,
}: DeleteFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const deleted = await onDelete();
    setIsDeleting(false);
    if (deleted) setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="min-w-0 px-2 text-red-600 hover:text-red-700 dark:text-red-400 sm:px-3"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Delete02Icon} className="size-4 sm:mr-1.5" />
        <span className="truncate">ลบ</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md font-kanit">
          <DialogHeader>
            <DialogTitle>ลบไฟล์หรือไม่?</DialogTitle>
            <DialogDescription>
              คุณกำลังจะลบไฟล์ <span className="font-semibold text-slate-900 dark:text-slate-100">{fileName}</span>
              การกระทำนี้ไม่สามารถยกเลิกได้
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

