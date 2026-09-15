import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
      <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">
        เซสชันหมดอายุ
      </h1>
      <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
        กรุณาเข้าสู่ระบบใหม่เพื่อดำเนินการต่อ
      </p>
      <Button asChild className="mt-5">
        <Link href="/">เข้าสู่ระบบ</Link>
      </Button>
    </div>
  );
}
