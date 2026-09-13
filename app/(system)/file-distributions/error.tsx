"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function FileDistributionsError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error("Unable to load file distributions", error); }, [error]);
  return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed bg-white/60 p-8 text-center dark:bg-slate-900/50"><h1 className="text-xl font-bold">โหลดงานกระจายไฟล์ไม่สำเร็จ</h1><p className="mt-2 text-sm text-slate-500">ไม่สามารถอ่าน Snapshot จาก Backend ได้ กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์ files.distribute</p><Button className="mt-5" onClick={unstable_retry}>ลองอีกครั้ง</Button></div>;
}
