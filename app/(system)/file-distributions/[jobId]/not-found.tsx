import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FileDistributionNotFound() {
  return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed bg-white/60 p-8 text-center dark:bg-slate-900/50"><div className="mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-2xl dark:bg-slate-800">?</div><h1 className="text-xl font-bold">ไม่พบงานกระจายไฟล์</h1><p className="mt-2 text-sm text-slate-500">งานนี้อาจถูกลบไปแล้ว หรือบัญชีของคุณไม่มีสิทธิ์เข้าถึง</p><Button asChild className="mt-5"><Link href="/file-distributions">กลับไปหน้ารายการ</Link></Button></div>;
}
