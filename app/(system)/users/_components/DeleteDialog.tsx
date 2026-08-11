"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { User } from "../_lib/types";

export default function DeleteDialog({ user, onOpenChange, onConfirm }: { user: User | null; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  async function confirm() { if (pending) return; setPending(true); try { await onConfirm(); } finally { setPending(false); } }
  return <AlertDialog open={user !== null} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>ลบบัญชีผู้ใช้งาน?</AlertDialogTitle><AlertDialogDescription>บัญชี “{user?.display_name || user?.username}” และ session ทั้งหมดจะถูกลบถาวร</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel><Button variant="destructive" onClick={confirm} disabled={pending}>{pending ? "กำลังลบ..." : "ยืนยันลบ"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
