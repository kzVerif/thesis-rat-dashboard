"use client";

import { useRef, useState, type FormEvent } from "react";
import { loadAuditLog, loadAuditLogs } from "@/actions/auditlogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AuditLog, AuditLogsSnapshot, LogsQuery } from "../_lib/types";

const emptyFilters = { user_id: "", target_agent_id: "", action: "", from: "", to: "" };
const uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(date);
}
function actor(log: AuditLog) {
  return log.display_name || log.username || (typeof log.detail?.actor_username === "string" ? log.detail.actor_username : null) || log.user_id || "ไม่ระบุผู้กระทำ";
}
function HttpStatus({ log }: { log: AuditLog }) {
  const status = log.detail?.status_code;
  const success = typeof log.detail?.success === "boolean" ? log.detail.success : typeof status === "number" ? status >= 200 && status < 400 : null;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${success === true ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : success === false ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{typeof status === "number" ? `${status} · ` : ""}{success === true ? "สำเร็จ" : success === false ? "ไม่สำเร็จ" : "ไม่ระบุ"}</span>;
}

export default function AuditLogsView({ snapshot }: { snapshot: AuditLogsSnapshot }) {
  const [data, setData] = useState(snapshot.data);
  const [query, setQuery] = useState(snapshot.query);
  const [filters, setFilters] = useState(emptyFilters);
  const [limit, setLimit] = useState(20);
  const [fixedEnd, setFixedEnd] = useState(false);
  const [error, setError] = useState(snapshot.error);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequest = useRef(0);

  async function reload(next: LogsQuery) {
    setPending(true); setError(null); setQuery(next);
    try {
      const result = await loadAuditLogs(next);
      if (result.ok) {
        setData(result.data);
        setQuery({ ...next, page: result.data.pagination.page });
      }
      else { setData(null); setError(result.error); }
    } catch { setData(null); setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) { setError("เวลาเริ่มต้นต้องไม่อยู่หลังเวลาสิ้นสุด"); return; }
    setFixedEnd(Boolean(filters.to));
    void reload({ ...filters, user_id: filters.user_id.trim(), target_agent_id: filters.target_agent_id.trim(), action: filters.action.trim(), page: 1, limit, from: filters.from ? new Date(filters.from).toISOString() : "", to: filters.to ? new Date(filters.to).toISOString() : new Date().toISOString() });
  }
  async function showDetail(id: string) {
    const request = ++detailRequest.current;
    setSelected(id); setDetail(null); setDetailError(null);
    try {
      const result = await loadAuditLog(id);
      if (request !== detailRequest.current) return;
      if (result.ok) setDetail(result.data); else setDetailError(result.error);
    } catch { if (request === detailRequest.current) setDetailError("โหลดรายละเอียดไม่สำเร็จ กรุณาลองอีกครั้ง"); }
  }
  const pagination = data?.pagination;
  return <div className="mx-auto w-full max-w-7xl">
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Audit Logs</p><h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">ประวัติการใช้งานระบบ</h1><p className="mt-2 text-sm text-slate-500">ตรวจสอบการเปลี่ยนแปลงข้อมูล การเข้าใช้งาน และเหตุการณ์ผิดพลาดที่ระบบบันทึก</p></div>
      <Button variant="outline" disabled={pending} onClick={() => reload({ ...query, page: 1, to: fixedEnd ? query.to : new Date().toISOString() })}>{pending ? "กำลังโหลด..." : "รีเฟรช"}</Button>
    </header>
    <details className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20 sm:p-5">
      <summary className="cursor-pointer font-medium text-blue-700 dark:text-blue-300">ขอบเขตประวัติและอายุการเก็บข้อมูล</summary>
      <div className="mt-3 space-y-2 leading-relaxed text-slate-600 dark:text-slate-400">
        <p>บันทึกการสร้าง แก้ไข ลบข้อมูล และการเข้าใช้งานผ่าน POST, PUT, PATCH, DELETE ทั้งสำเร็จและล้มเหลว การอ่านข้อมูลทั่วไปและการเปิดดูประวัติไม่สร้างรายการใหม่</p>
        <p>ทุก method ยังคงบันทึกข้อผิดพลาด 401, 403, 429 และ 5xx ส่วน GET ที่ตอบ 400 หรือ 404 ไม่บันทึก</p>
        <p>ข้อผิดพลาดตั้งแต่ 400 ขึ้นไปที่มีผู้ใช้, IP, method + route และสถานะเดียวกัน จะบันทึกครั้งแรกในหน้าต่าง 1 นาที โดยไม่แยกเครื่องเป้าหมายและไม่รวมยอดที่ข้าม เมื่อถึงขีดจำกัดของหน้าต่างอาจข้ามเหตุการณ์ชุดใหม่ด้วย จำนวนรายการจึงเป็นจำนวนที่บันทึก ไม่ใช่จำนวนครั้งที่เกิดทั้งหมด ส่วนการกระทำสำเร็จไม่ถูกรวมรายการ</p>
        <p>อายุเก็บเริ่มต้น 90 วัน ผู้ดูแลอาจตั้งค่าแตกต่างออกไป ระบบลบข้อมูลเก่าอย่างถาวรเป็นรอบทุก 24 ชั่วโมง ไม่มีการเก็บสำเนาอัตโนมัติ และอาจพบรายการเกินอายุระหว่างรอบลบ</p>
      </div>
    </details>
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <h2 className="mb-4 text-lg font-semibold">กรองประวัติ</h2>
      <form onSubmit={apply}><fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-2 text-sm"><span>ผู้กระทำ (UUID)</span><Input value={filters.user_id} pattern={uuidPattern} onChange={e => setFilters({ ...filters, user_id: e.target.value })} placeholder="UUID ของผู้ใช้" /></label>
        <label className="space-y-2 text-sm"><span>เครื่องเป้าหมาย (UUID)</span><Input value={filters.target_agent_id} pattern={uuidPattern} onChange={e => setFilters({ ...filters, target_agent_id: e.target.value })} placeholder="UUID ของ Agent" /></label>
        <label className="space-y-2 text-sm"><span>Action (ตรงกันทั้งหมด)</span><Input value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} placeholder="POST /api/rooms/" /></label>
        <label className="space-y-2 text-sm"><span>ตั้งแต่ (เวลาท้องถิ่นของอุปกรณ์)</span><Input type="datetime-local" step="1" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></label>
        <label className="space-y-2 text-sm"><span>ถึง (เวลาท้องถิ่นของอุปกรณ์)</span><Input type="datetime-local" step="1" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></label>
        <label className="space-y-2 text-sm"><span>จำนวนรายการต่อหน้า</span><select className="h-9 w-full rounded-md border border-input bg-background px-3" value={limit} onChange={e => setLimit(Number(e.target.value))}>{[20, 50, 100].map(size => <option key={size} value={size}>{size} รายการ</option>)}</select></label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">ค้นหา</Button><Button type="button" variant="outline" onClick={() => { setFilters(emptyFilters); setLimit(20); setFixedEnd(false); void reload({ ...emptyFilters, page: 1, limit: 20, to: new Date().toISOString() }); }}>ล้างตัวกรอง</Button></div>
      </fieldset></form>
    </section>
    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"><span>{error}</span><Button variant="outline" disabled={pending} onClick={() => reload(query)}>ลองอีกครั้ง</Button></div>}
    <section aria-busy={pending} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5"><h2 className="text-lg font-semibold">ประวัติที่บันทึกตามตัวกรอง <span className="text-sm font-normal text-slate-500">{pagination ? `${pagination.total.toLocaleString()} รายการ` : ""}</span></h2><p className="mt-1 text-xs text-slate-500">ใหม่สุดก่อน · เวลาในตารางเป็นเวลาไทย{query.to ? ` · ข้อมูลถึง ${dateLabel(query.to)}` : ""}</p></div>
      {pending ? <div role="status" className="p-16 text-center text-sm text-slate-500">กำลังโหลดประวัติการใช้งาน...</div> : data?.logs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50/80 text-xs text-slate-500 dark:bg-slate-950/40"><tr>{["เวลา", "ผู้กระทำ", "Action", "เครื่องเป้าหมาย", "ผล HTTP", "IP Address", "รายละเอียด"].map(title => <th scope="col" key={title} className="px-4 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.logs.map(log => <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{dateLabel(log.created_at)}</td><td className="max-w-56 break-words px-4 py-4 font-medium">{actor(log)}{log.username && <p className="mt-1 text-xs font-normal text-slate-500">@{log.username}</p>}</td><td className="max-w-80 break-words px-4 py-4 font-mono text-xs">{log.action}</td><td className="max-w-48 break-words px-4 py-4">{log.agent_hostname || log.target_agent_id || "—"}</td><td className="px-4 py-4"><HttpStatus log={log} /></td><td className="px-4 py-4 font-mono text-xs">{log.ip_address || "—"}</td><td className="px-4 py-4"><Button variant="outline" size="sm" onClick={() => showDetail(log.id)} aria-label={`ดูรายละเอียด ${log.action}`}>ดูรายละเอียด</Button></td></tr>)}</tbody></table></div> : <div className="p-16 text-center"><h3 className="font-semibold">{error ? "ไม่สามารถแสดงประวัติได้" : "ไม่พบประวัติการใช้งาน"}</h3><p className="mt-2 text-sm text-slate-500">{error ? "กรุณาตรวจสอบข้อความด้านบนแล้วลองอีกครั้ง" : "ลองเปลี่ยนตัวกรองหรือรีเฟรชเพื่อดูรายการล่าสุด"}</p></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800"><span aria-live="polite" className="text-slate-500">{pagination && pagination.total > 0 ? `หน้า ${pagination.page} / ${pagination.total_pages}` : "ไม่มีรายการ"}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pending || !pagination || pagination.page <= 1} onClick={() => reload({ ...query, page: query.page - 1 })}>ก่อนหน้า</Button><Button variant="outline" size="sm" disabled={pending || !pagination || pagination.page >= pagination.total_pages} onClick={() => reload({ ...query, page: query.page + 1 })}>ถัดไป</Button></div></div>
    </section>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) { ++detailRequest.current; setSelected(null); } }}><DialogContent className="max-h-[85vh] overflow-y-auto font-kanit sm:max-w-2xl"><DialogHeader><DialogTitle>รายละเอียดประวัติการใช้งาน</DialogTitle><DialogDescription>ผล HTTP เป็นผลของคำขอ ไม่ใช่ผลการทำงานภายหลังของเครื่องลูก</DialogDescription></DialogHeader>
      {detailError ? <div role="alert" className="space-y-3 text-sm text-red-600"><p>{detailError}</p><Button variant="outline" onClick={() => selected && showDetail(selected)}>ลองอีกครั้ง</Button></div> : !detail ? <p role="status" className="py-8 text-center text-sm text-slate-500">กำลังโหลดรายละเอียด...</p> : <div className="space-y-4"><HttpStatus log={detail} /><dl className="grid gap-3 text-sm sm:grid-cols-2">{Object.entries({ "รหัสรายการ": detail.id, "เวลา (ไทย)": dateLabel(detail.created_at), "ผู้กระทำ": actor(detail), "User ID": detail.user_id, "Action": detail.action, "เครื่องเป้าหมาย": detail.agent_hostname, "Agent ID": detail.target_agent_id, "IP Address": detail.ip_address }).map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-all">{value || "—"}</dd></div>)}</dl><div><h3 className="mb-2 text-sm font-semibold">ข้อมูลที่บันทึก (Detail)</h3><pre className="overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-950">{JSON.stringify(detail.detail, null, 2)}</pre></div></div>}
    </DialogContent></Dialog>
  </div>;
}
