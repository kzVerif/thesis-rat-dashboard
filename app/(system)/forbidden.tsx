import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
      <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </h1>
      <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
        บัญชีของคุณไม่มีสิทธิ์ดำเนินการนี้ กรุณาติดต่อผู้ดูแลระบบ
      </p>
      <Button asChild className="mt-5">
        <Link href="/dashboard">กลับหน้าหลัก</Link>
      </Button>
    </div>
  );
}
