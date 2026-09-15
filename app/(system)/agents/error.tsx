"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type AgentsErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function AgentsError({ unstable_retry }: AgentsErrorProps) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
      <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">
        ไม่สามารถเปิดหน้าจัดการ Agents ได้
      </h1>
      <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
        บัญชีนี้ไม่มีสิทธิ์ดำเนินการ หรือระบบไม่สามารถโหลดข้อมูลได้
        กรุณาติดต่อผู้ดูแลระบบหากคิดว่านี่เป็นข้อผิดพลาด
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={unstable_retry}>
          ลองอีกครั้ง
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/dashboard">กลับหน้าหลัก</Link>
        </Button>
      </div>
    </div>
  );
}
