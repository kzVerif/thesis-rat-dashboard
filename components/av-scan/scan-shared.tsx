"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusLabels, useScans, type ScanStatus } from "./scan-provider";

export const panelClass = "rounded-2xl border bg-card p-4 shadow-sm sm:p-6";
export function ScanHeader({ results = false }: { results?: boolean }) {
  const { connection, error, uncertain, historyLoaded, acknowledgeUncertain } = useScans();
  const labels = { connecting: "กำลังเชื่อมต่อ", live: "เชื่อมต่อแล้ว", reconnecting: "กำลังเชื่อมต่อใหม่", disconnected: "ไม่ได้เชื่อมต่อ" };
  return <header className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold tracking-[0.18em] text-blue-600 dark:text-blue-400">ENDPOINT SECURITY</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{results ? "ติดตามผล AV Scan" : "สั่งสแกนไวรัส"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{results ? "ติดตามสถานะและรายงานจาก Antivirus ของแต่ละเครื่อง" : "เลือกประเภทการสแกน และกำหนดเครื่องที่ต้องการตรวจสอบ"}</p>
      </div><Badge variant="outline" role="status" className={connection === "live" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{labels[connection]}</Badge>
    </div>
    <nav aria-label="AV Scan" className="flex flex-wrap gap-2 border-b pb-4">
      <Button asChild variant={results ? "ghost" : "default"}><Link href="/av-scans" aria-current={!results ? "page" : undefined}>สั่ง AV Scan</Link></Button>
      <Button asChild variant={results ? "default" : "ghost"}><Link href="/av-scans/results" aria-current={results ? "page" : undefined}>ติดตามผลการสแกน</Link></Button>
    </nav>
    {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    {uncertain && <div role="alert" className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"><p>คำสั่งล่าสุดยังไม่ได้รับการยืนยัน อาจสร้างงานแล้ว กรุณาตรวจสอบประวัติก่อนตัดสินใจสั่งใหม่</p><Button asChild variant="outline" size="sm"><Link href="/av-scans/results">ตรวจประวัติ</Link></Button>{results && <Button className="ml-2" size="sm" disabled={!historyLoaded} onClick={acknowledgeUncertain}>ตรวจประวัติแล้ว ปลดล็อกการสั่งงาน</Button>}</div>}
    {connection !== "live" && <p className="text-sm text-muted-foreground">ยังไม่ได้รับข้อมูลล่าสุด การขาดการเชื่อมต่อไม่ได้หมายความว่างานสแกนล้มเหลว</p>}
  </header>;
}
export function ScanBadge({ status, label }: { status: ScanStatus; label?: string }) {
  const colors: Record<ScanStatus, string> = {
    QUEUED: "text-slate-500", DELIVERED: "text-blue-600 dark:text-blue-400", RUNNING: "text-blue-600 dark:text-blue-400",
    SUCCEEDED: "text-emerald-700 dark:text-emerald-400", FAILED: "text-red-600 dark:text-red-400", CANCELLED: "text-slate-500", EXPIRED: "text-amber-600 dark:text-amber-400",
  };
  return <Badge variant="outline" className={colors[status]}>{label ?? statusLabels[status]}</Badge>;
}
