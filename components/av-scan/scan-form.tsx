"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { validScanPath } from "@/lib/virus-scan";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { SecurityCheckIcon, ComputerIcon, MeetingRoomIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useScans, type ScanMode } from "./scan-provider";
import { panelClass, ScanHeader } from "./scan-shared";

import type { ScanSnapshot } from "@/app/(system)/av-scans/_lib/types";

const agentStatusLabels = { ONLINE: "ออนไลน์", OFFLINE: "ออฟไลน์", WARNING: "มีคำเตือน", DISABLED: "ปิดใช้งาน" };

const modes: { value: ScanMode; title: string; description: string; note: string }[] = [
  { value: "quick", title: "Quick Scan", description: "ตรวจสอบพื้นที่สำคัญและจุดที่มักพบภัยคุกคาม", note: "สำหรับการตรวจสอบเบื้องต้น" },
  { value: "custom", title: "Custom Scan", description: "ระบุไฟล์หรือโฟลเดอร์ที่ต้องการตรวจสอบ", note: "กำหนดหนึ่งเส้นทางต่อการสแกน" },
  { value: "full", title: "Full Scan", description: "ตรวจสอบไฟล์และพื้นที่ทั้งหมดของเครื่อง", note: "อาจใช้เวลานานและทรัพยากรมาก" },
];
export function ScanForm({ snapshot }: { snapshot: ScanSnapshot }) {
  const { computers, rooms, error } = snapshot;
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const { submit, connection, submitting, uncertain } = useScans();
  const [mode, setMode] = useState<ScanMode>("quick");
  const [scope, setScope] = useState<"room" | "computers">("room");
  const [room, setRoom] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [pathsText, setPathsText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const paths = pathsText.trim() ? [pathsText.trim()] : [];
  const invalidPaths = paths.length > 0 && !validScanPath(paths[0]);
  const roomName = rooms.find(r => r.id === room)?.name ?? "";
  const targets = computers.filter(c => scope === "room" ? c.roomId === room : selected.includes(c.id));
  const ready = targets.filter(c => c.online);
  const visible = computers.filter(c => (!filterRoom || (filterRoom === "unassigned" ? c.roomId === null : c.roomId === filterRoom)) && `${c.hostname} ${c.ip} ${c.room}`.toLowerCase().includes(query.toLowerCase()));
  const visibleOnline = visible.filter(c => c.online);
  const allVisibleSelected = visibleOnline.length > 0 && visibleOnline.every(c => selected.includes(c.id));
  const valid = !error && !refreshing && connection === "live" && !submitting && !uncertain && ready.length > 0 && ready.length <= 100 && (mode !== "custom" || (paths.length > 0 && !invalidPaths));
  async function start() {
    if (!valid) return;
    try {
      await submit(mode, ready.map(c => c.id), mode === "custom" ? paths[0] : undefined);
      setConfirm(false);
      toast.success("ระบบรับงานสแกนแล้ว", { description: "กำลังติดตามสถานะจากเครื่องปลายทาง" });
      router.push("/av-scans/results");
    } catch (error) {
      setConfirm(false);
      toast.error("ยังเริ่มงานไม่ได้", { description: error instanceof Error ? error.message : "ไม่สามารถส่งคำสั่งได้" });
    }
  }
  return <div className="mx-auto max-w-7xl space-y-6"><ScanHeader />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground" role="status">{refreshing ? "กำลังอัปเดตข้อมูล…" : error ? "โหลดข้อมูลไม่สำเร็จ" : `${rooms.length} ห้อง • ${computers.length} เครื่อง • ออนไลน์ ${computers.filter(c => c.online).length} เครื่อง`}</p><Button variant="outline" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "กำลังโหลด…" : "รีเฟรชข้อมูลเครื่อง"}</Button></div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error} • กรุณาลองรีเฟรชข้อมูลอีกครั้ง</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <section className={panelClass}>
          <h2 className="mb-4 text-lg font-semibold">1. เลือกประเภทการสแกน</h2>
          <div className="grid gap-3 md:grid-cols-3">{modes.map(m => <label key={m.value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${mode === m.value ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "hover:bg-muted/50"}`}>
            <div className="mb-4 flex items-center justify-between"><HugeiconsIcon icon={SecurityCheckIcon} className="size-6 text-blue-500" /><input type="radio" name="scan-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="size-4 accent-blue-600" /></div>
            <span className="font-semibold">{m.title}</span><p className="mt-2 text-sm text-muted-foreground">{m.description}</p><p className="mt-4 text-xs text-muted-foreground">{m.note}</p>
          </label>)}</div>
          {mode === "custom" && <div className="mt-5 space-y-2"><label htmlFor="scan-paths" className="text-sm font-medium">เส้นทางไฟล์หรือโฟลเดอร์ <span className="text-destructive">*</span></label>
            <Input id="scan-paths" value={pathsText} onChange={e => setPathsText(e.target.value)} placeholder="C:\\Users\\Public\\Downloads" aria-describedby="path-help" aria-invalid={invalidPaths} className="font-mono" />
            <p id="path-help" className={`text-xs ${invalidPaths ? "text-destructive" : "text-muted-foreground"}`}>{invalidPaths ? "ห้าม wildcard หรือหลายเส้นทาง กรุณาระบุเส้นทาง Windows แบบเต็ม เช่น C:\\Downloads หรือ \\\\server\\share" : "ระบุหนึ่งเส้นทางแบบเต็ม ห้าม wildcard (* หรือ ?) • ใช้เส้นทางเดียวกันทุกเครื่อง"}</p></div>}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 text-lg font-semibold">2. เลือกเป้าหมาย</h2>
          <div className="mb-5 flex gap-2">{(["room", "computers"] as const).map(s => <Button key={s} variant={scope === s ? "default" : "outline"} aria-pressed={scope === s} onClick={() => setScope(s)}><HugeiconsIcon icon={s === "room" ? MeetingRoomIcon : ComputerIcon} className="size-4" />{s === "room" ? "สแกนทั้งห้อง" : "เลือกเป็นรายเครื่อง"}</Button>)}</div>
          {scope === "room" ? <div className="space-y-3">{rooms.map(r => <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${room === r.id ? "border-blue-500 bg-blue-500/5" : "hover:bg-muted/50"}`}><input type="radio" name="scan-room" checked={room === r.id} onChange={() => setRoom(r.id)} className="size-4 accent-blue-600" /><span className="flex-1 text-sm font-medium">{r.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{computers.filter(c => c.roomId === r.id).length} เครื่องทั้งหมด</span></span><span className="text-xs text-emerald-600 dark:text-emerald-400">ออนไลน์ {computers.filter(c => c.roomId === r.id && c.online).length}</span><span className="text-xs text-muted-foreground">ไม่พร้อม {computers.filter(c => c.roomId === r.id && !c.online).length}</span></label>)}{!rooms.length && !error && <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีห้องในระบบ เลือกเป็นรายเครื่องเพื่อดูเครื่องที่ยังไม่ได้จัดห้อง</p>}</div> : <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="ค้นหาเครื่อง" placeholder="ค้นหาชื่อเครื่อง หรือ IP Address" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="กรองตามห้อง" value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="">ทุกห้อง</option><option value="unassigned">ยังไม่ได้จัดห้อง</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={allVisibleSelected} disabled={!visibleOnline.length} onChange={() => setSelected(current => allVisibleSelected ? current.filter(id => !visibleOnline.some(c => c.id === id)) : [...new Set([...current, ...visibleOnline.map(c => c.id)])])} className="size-4 accent-blue-600" />เลือกเครื่องออนไลน์ที่แสดงทั้งหมด</label><Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={!selected.length}>ล้างที่เลือก ({selected.length})</Button></div>
            <div className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2">{visible.map(c => <label key={c.id} className={`flex items-center gap-3 rounded-xl border p-3 ${!c.online ? "opacity-50" : "cursor-pointer hover:bg-muted/50"} ${selected.includes(c.id) ? "border-blue-500 bg-blue-500/5" : ""}`}><input type="checkbox" disabled={!c.online} checked={selected.includes(c.id)} onChange={() => setSelected(current => current.includes(c.id) ? current.filter(id => id !== c.id) : [...current, c.id])} className="size-4 accent-blue-600" /><span className="min-w-0 text-sm"><span className="font-medium">{c.hostname}</span><span className="block text-xs text-muted-foreground">{c.ip} • {c.room}</span><span className={`text-xs ${c.online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{agentStatusLabels[c.agentStatus]}{!c.online && " • ไม่พร้อมสแกน"}</span></span></label>)}</div>
            {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">ไม่พบเครื่องที่ตรงกับการค้นหา</p>}
          </div>}
          <p className="mt-4 text-xs text-muted-foreground">สถานะจากการโหลดข้อมูลล่าสุด • สั่งสแกนเฉพาะเครื่อง ONLINE โดยข้ามเครื่อง OFFLINE, WARNING และ DISABLED</p>
        </section>
      </div>
      <aside className={`${panelClass} h-fit space-y-5 xl:sticky xl:top-24`}>
        <h2 className="text-lg font-semibold">สรุปการสแกน</h2>
        <dl className="space-y-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">ประเภท</dt><dd className="font-medium">{mode.toUpperCase()}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">เป้าหมาย</dt><dd className="text-right">{scope === "room" ? roomName || "ยังไม่ได้เลือกห้อง" : "เลือกเป็นรายเครื่อง"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">พร้อมสแกน</dt><dd className="font-semibold text-blue-600 dark:text-blue-400">{ready.length} เครื่อง</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">ข้ามเครื่องไม่พร้อม</dt><dd>{targets.length - ready.length} เครื่อง</dd></div>{mode === "custom" && <div className="flex justify-between"><dt className="text-muted-foreground">เส้นทางที่ระบุ</dt><dd>{paths.length} รายการ</dd></div>}</dl>
        {mode === "full" && <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-400">Full Scan อาจกระทบการใช้งานเครื่อง ควรเลือกช่วงเวลาที่ไม่มีการเรียนการสอน</p>}
        {ready.length > 100 && <p role="alert" className="text-sm text-destructive">เลือกได้สูงสุด 100 เครื่องต่อหนึ่งงาน กรุณาเลือกเป็นรายเครื่องเพื่อลดจำนวน</p>}
        <Button className="w-full" disabled={!valid} onClick={() => setConfirm(true)}>{submitting ? "กำลังรอระบบยืนยัน…" : "เริ่มสแกน"}</Button>
        {!valid && <p className="text-xs text-muted-foreground">ต้องเชื่อมต่อระบบและเลือกเครื่องพร้อมสแกน 1–100 เครื่อง{mode === "custom" ? " และระบุเส้นทางให้ถูกต้อง" : ""}</p>}
      </aside>
    </div>
    <Dialog open={confirm} onOpenChange={open => { if (!submitting) setConfirm(open); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>ยืนยันสั่งสแกนไวรัส</DialogTitle><DialogDescription>สแกนแบบ {mode.toUpperCase()} จำนวน {ready.length} เครื่อง • {scope === "room" ? roomName : "เครื่องที่เลือก"} ระบบจะส่งคำสั่งสแกนไปยังเครื่องที่ระบุ</DialogDescription></DialogHeader>
      <div className="max-h-48 overflow-y-auto rounded-lg border p-3 text-sm">{ready.map(c => <p key={c.id} className="py-1">{c.hostname} <span className="text-muted-foreground">{c.ip}</span></p>)}</div>
      {mode === "custom" && <div className="max-h-32 overflow-auto text-xs"><p className="mb-2 font-medium">เส้นทางที่จะสแกน</p>{paths.map(p => <p key={p} className="break-all font-mono">{p}</p>)}</div>}
      <DialogFooter><Button variant="outline" disabled={submitting} onClick={() => setConfirm(false)}>กลับไปแก้ไข</Button><Button disabled={!valid} onClick={start}>{submitting ? "กำลังรอยืนยัน…" : "ยืนยันสั่งสแกน"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
