"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight01Icon, ComputerIcon, Delete02Icon, Edit03Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { deleteAgentAction, updateAgentAction } from "@/actions/agents";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Agent, AgentInput, AgentsPagination, AgentStatus } from "../_lib/types";
import type { Room } from "../../rooms/_lib/types";

type FormValues = { hostname: string; roomId: string };

function toForm(agent: Agent): FormValues {
  return { hostname: agent.hostname, roomId: agent.room_id ?? "" };
}

function payload(agent: Agent, values: FormValues): AgentInput {
  return {
    hostname: values.hostname.trim(), room_id: values.roomId || null, os_info: agent.os_info,
    mac_address: agent.mac_address, ip_address: agent.ip_address, status: agent.status,
    last_seen: agent.last_seen, enrolled_at: agent.enrolled_at,
  };
}

export default function AgentManagement({ initialAgents, rooms, pagination }: { initialAgents: Agent[]; rooms: Room[]; pagination: AgentsPagination }) {
  const [agents, setAgents] = useState(initialAgents);
  const [total, setTotal] = useState(pagination.total);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => [agent.hostname, agent.room_id, roomLabel(agent.room_id, rooms), agent.mac_address, agent.ip_address, agent.status, osLabel(agent.os_info)]
      .some((value) => value?.toLocaleLowerCase().includes(q)));
  }, [agents, query, rooms]);

  function update(values: FormValues) {
    if (!editing) return;
    startTransition(async () => {
      try {
        const result = await updateAgentAction(editing.id, payload(editing, values));
        if (!result.ok) { toast.error("ไม่สามารถแก้ไข Agent ได้", { description: result.error }); return; }
        setAgents((current) => current.map((item) => item.id === result.data.id ? result.data : item)); setEditing(null); toast.success("แก้ไข Agent เรียบร้อยแล้ว");
      } catch (error) { toast.error("ข้อมูลไม่ถูกต้อง", { description: error instanceof Error ? error.message : undefined }); }
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteAgentAction(deleting.id);
      if (!result.ok) { toast.error("ไม่สามารถลบ Agent ได้", { description: result.error }); return; }
      setAgents((current) => current.filter((item) => item.id !== deleting.id)); setTotal((current) => Math.max(0, current - 1)); setDeleting(null); toast.success("ลบ Agent เรียบร้อยแล้ว");
    });
  }

  return <>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Agents ทั้งหมด <span className="ml-1 text-sm font-normal text-slate-500">{total} เครื่อง</span></h2><p className="mt-1 text-sm text-slate-500">ข้อมูลเครื่องและเครือข่ายจากฐานข้อมูล</p></div>
        <div className="sm:w-80">
          <label className="relative block sm:w-80"><span className="sr-only">ค้นหา Agent</span><HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ, MAC, IP, OS..." className="h-10 pl-9" /></label>
        </div>
      </div>
      {visible.length === 0 ? <Empty /> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50/80 text-left text-xs text-slate-500 dark:bg-slate-950/40"><tr>{["ชื่อเครื่อง", "ห้อง", "หมายเลข MAC", "หมายเลข IP", "ระบบปฏิบัติการ", "สถานะ", "พบล่าสุด", "จัดการ"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((agent) => <tr key={agent.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-4 py-4 font-semibold">{agent.hostname}</td><td className="max-w-44 truncate px-4 py-4">{roomLabel(agent.room_id, rooms)}</td><td className="px-4 py-4 font-mono text-xs">{agent.mac_address ?? "—"}</td><td className="px-4 py-4 font-mono text-xs">{agent.ip_address ?? "—"}</td><td className="px-4 py-4">{osLabel(agent.os_info)}</td><td className="px-4 py-4"><StatusBadge status={agent.status} /></td><td className="px-4 py-4 text-xs text-slate-500">{dateLabel(agent.last_seen)}</td><td className="px-4 py-4"><Actions agent={agent} onEdit={setEditing} onDelete={setDeleting} /></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">{visible.map((agent) => <article key={agent.id} className="p-4"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><HugeiconsIcon icon={ComputerIcon} className="size-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{agent.hostname}</h3><p className="mt-1 truncate text-xs text-slate-500">{agent.ip_address ?? "ไม่มี IP address"}</p></div><StatusBadge status={agent.status} /></div><div className="mt-4"><Actions agent={agent} onEdit={setEditing} onDelete={setDeleting} /></div></article>)}</div>
      </>}
      <PaginationFooter pagination={{ ...pagination, total }} visibleCount={visible.length} />
    </section>
    {editing && <AgentFormDialog key={editing.id} open onOpenChange={(open) => !open && setEditing(null)} agent={editing} rooms={rooms} pending={pending} onSubmit={update} />}
    <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}><DialogContent className="font-kanit sm:max-w-md"><DialogHeader><DialogTitle>ยืนยันการลบ Agent</DialogTitle><DialogDescription>การลบ {deleting?.hostname} จะลบ commands ที่เกี่ยวข้องด้วย และไม่สามารถย้อนกลับได้</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>ยกเลิก</Button><Button variant="destructive" onClick={remove} disabled={pending}>{pending ? "กำลังลบ..." : "ยืนยันลบ"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function AgentFormDialog({ open, onOpenChange, agent, rooms, pending, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; agent: Agent; rooms: Room[]; pending: boolean; onSubmit: (values: FormValues) => void }) {
  const [form, setForm] = useState(() => toForm(agent));
  const set = (key: keyof FormValues, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(form); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="font-kanit sm:max-w-lg"><DialogHeader><DialogTitle>แก้ไข Agent</DialogTitle><DialogDescription>แก้ไขชื่อเครื่องและห้องที่ติดตั้ง Agent</DialogDescription></DialogHeader><form onSubmit={submit}><div className="grid gap-4">
    <Field label="ชื่อเครื่อง *"><Input value={form.hostname} onChange={(e) => set("hostname", e.target.value)} required maxLength={255} /></Field>
    <Field label="ห้องที่ติดตั้ง"><select value={form.roomId} onChange={(e) => set("roomId", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">ยังไม่ได้จัดห้อง</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="หมายเลข IP"><Input value={agent.ip_address ?? "ไม่มีข้อมูล"} readOnly className="cursor-not-allowed bg-slate-100 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300" /></Field>
      <Field label="หมายเลข MAC"><Input value={agent.mac_address ?? "ไม่มีข้อมูล"} readOnly className="cursor-not-allowed bg-slate-100 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300" /></Field>
    </div>
  </div><DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button><Button type="submit" disabled={pending} className="bg-blue-600 text-white hover:bg-blue-700">{pending ? "กำลังบันทึก..." : "บันทึก"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function PaginationFooter({ pagination, visibleCount }: { pagination: AgentsPagination; visibleCount: number }) {
  const totalPages = pagination.total === 0 ? 0 : Math.ceil(pagination.total / pagination.limit);
  const firstItem = visibleCount === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = visibleCount === 0 ? 0 : firstItem + visibleCount - 1;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    return start + index;
  });
  const href = (page: number) => `/agents?page=${page}&limit=${pagination.limit}`;

  return <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex flex-wrap items-center gap-3">
      <span>{visibleCount === 0 ? "ไม่พบรายการในหน้านี้" : `แสดง ${firstItem}–${lastItem} จาก ${pagination.total} เครื่อง`}</span>
      <form action="/agents" method="get" className="flex items-center gap-2">
        <input type="hidden" name="page" value="1" />
        <Label htmlFor="agents-limit" className="text-xs font-normal">รายการต่อหน้า</Label>
        <select id="agents-limit" name="limit" defaultValue={pagination.limit} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-slate-700 dark:text-slate-300">
          {[10, 20, 50, 100].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
        </select>
      </form>
    </div>
    {totalPages > 1 && <nav aria-label="แบ่งหน้ารายการ Agent" className="flex items-center gap-1">
      <Button asChild size="sm" variant="outline" className="h-8" disabled={pagination.page <= 1}><Link aria-disabled={pagination.page <= 1} tabIndex={pagination.page <= 1 ? -1 : undefined} href={pagination.page <= 1 ? href(1) : href(pagination.page - 1)}>ก่อนหน้า</Link></Button>
      {pages.map((page) => <Button key={page} asChild size="sm" variant={page === pagination.page ? "default" : "outline"} className="size-8 p-0"><Link href={href(page)} aria-current={page === pagination.page ? "page" : undefined}>{page}</Link></Button>)}
      <Button asChild size="sm" variant="outline" className="h-8" disabled={pagination.page >= totalPages}><Link aria-disabled={pagination.page >= totalPages} tabIndex={pagination.page >= totalPages ? -1 : undefined} href={pagination.page >= totalPages ? href(totalPages) : href(pagination.page + 1)}>ถัดไป</Link></Button>
    </nav>}
  </footer>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Empty() { return <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><HugeiconsIcon icon={ComputerIcon} className="mb-3 size-8 text-slate-400" /><h3 className="font-semibold">ไม่พบ Agent</h3><p className="mt-1 text-sm text-slate-500">ยังไม่มีข้อมูลหรือไม่ตรงกับคำค้นหา</p></div>; }
function Actions({ agent, onEdit, onDelete }: { agent: Agent; onEdit: (agent: Agent) => void; onDelete: (agent: Agent) => void }) { return <div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/agents/${agent.id}`}><HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />รายละเอียด</Link></Button><Button size="sm" variant="outline" onClick={() => onEdit(agent)}><HugeiconsIcon icon={Edit03Icon} className="size-4" />แก้ไข</Button><Button size="sm" variant="destructive" onClick={() => onDelete(agent)}><HugeiconsIcon icon={Delete02Icon} className="size-4" />ลบ</Button></div>; }
function StatusBadge({ status }: { status: AgentStatus }) { const color = status === "ONLINE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : status === "WARNING" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : status === "DISABLED" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"; const labels: Record<AgentStatus, string> = { ONLINE: "ออนไลน์", OFFLINE: "ออฟไลน์", WARNING: "มีคำเตือน", DISABLED: "ปิดใช้งาน" }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{labels[status]}</span>; }
function roomLabel(id: string | null, rooms: Room[]) { if (!id) return "ยังไม่ได้จัดห้อง"; return rooms.find((room) => room.id === id)?.name ?? "ไม่พบข้อมูลห้อง"; }
function osLabel(value: Record<string, unknown> | null) { if (!value) return "—"; const name = typeof value.name === "string" ? value.name : ""; const version = typeof value.version === "string" ? value.version : ""; return [name, version].filter(Boolean).join(" ") || JSON.stringify(value); }
function dateLabel(value: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date); }
