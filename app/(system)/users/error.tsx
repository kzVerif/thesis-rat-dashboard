"use client";

import { Button } from "@/components/ui/button";

export default function UsersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30"><h2 className="font-semibold text-red-800 dark:text-red-200">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</h2><p className="mt-2 text-sm text-red-700 dark:text-red-300">{error.message}</p><Button className="mt-4" onClick={reset}>ลองอีกครั้ง</Button></div>;
}
