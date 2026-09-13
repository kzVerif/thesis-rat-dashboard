"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileDistribution } from "./file-distribution-provider";
import { DistributionConnectionBadge } from "./distribution-connection-badge";
import { DistributionProgress } from "./distribution-progress";
import { DistributionStatusBadge } from "./distribution-status-badge";
import { formatBytes, formatRelativeTime, type DistributionAgent, type DistributionTargetStatus } from "@/lib/file-distribution";
import type { FileDistributionJob } from "@/lib/file-distribution";
import { refreshFileDistributionAction } from "@/actions/file-distributions";
import { toast } from "sonner";

type AgentFilter = "ALL" | "DOWNLOADING" | "COMPLETED" | "FAILED" | "OFFLINE";
type Sort = "hostname" | "status" | "progress";
const priority: Record<DistributionTargetStatus, number> = { FAILED: 0, DOWNLOADING: 1, VERIFYING: 2, OFFLINE: 3, PENDING: 4, SENT: 5, CANCELLED: 6, COMPLETED: 7 };

export function DistributionDetail({ initialJob }: { initialJob: FileDistributionJob }) {
  const { jobs, connection, hydrateJobs } = useFileDistribution();
  const job = jobs[initialJob.id] ?? initialJob;
  const hasConnectedRef = useRef(false);
  const previousConnectionRef = useRef(connection);
  const [, startRefresh] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AgentFilter>("ALL");
  const [sort, setSort] = useState<Sort>("status");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const agents = useMemo(() => job ? Object.values(job.agents) : [], [job]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return agents.filter((agent) => (filter === "ALL" || agent.status === filter) && (!normalized || [agent.hostname, agent.agentId, agent.ipAddress ?? ""].some((value) => value.toLocaleLowerCase().includes(normalized)))).sort((a, b) => sort === "hostname" ? a.hostname.localeCompare(b.hostname) : sort === "progress" ? b.progress - a.progress : priority[a.status] - priority[b.status]);
  }, [agents, filter, query, sort]);

  useEffect(() => hydrateJobs([initialJob]), [hydrateJobs, initialJob]);
  useEffect(() => {
    const previous = previousConnectionRef.current;
    previousConnectionRef.current = connection;
    if (connection !== "live") return;
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      return;
    }
    if (previous === "live") return;
    startRefresh(async () => {
      const result = await refreshFileDistributionAction(initialJob.id);
      if (result.ok) hydrateJobs([result.data]);
      else toast.error("โหลดสถานะล่าสุดไม่สำเร็จ", { description: result.error });
    });
  }, [connection, hydrateJobs, initialJob.id]);

  const counts = countStatuses(agents);
  const completion = job.totalTargets ? counts.completed / job.totalTargets * 100 : 0;
  const transfer = agents.length ? agents.reduce((sum, agent) => sum + agent.progress, 0) / agents.length : 0;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <div className="mx-auto w-full max-w-[1500px] space-y-6">
    <header className="rounded-3xl border bg-gradient-to-br from-card to-blue-50/70 p-5 shadow-sm dark:to-blue-950/20 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><Link href="/file-distributions" className="text-sm font-medium text-blue-600 hover:underline">← กลับไปหน้ารายการ</Link><div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="break-all text-2xl font-bold sm:text-3xl">{job.filename}</h1><DistributionStatusBadge status={job.status} /></div><dl className="mt-5 grid gap-x-6 gap-y-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4"><Meta label="รหัสงาน" value={job.id} mono /><Meta label="เริ่มงานเมื่อ" value={new Date(job.createdAt).toLocaleString("th-TH")} /><Meta label="ปลายทาง" value={job.targetLabel} /><Meta label="ขนาดไฟล์" value={formatBytes(job.fileSize)} /></dl></div><DistributionConnectionBadge state={connection} /></div></header>
    {connection !== "live" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Realtime ขาดการเชื่อมต่อ ข้อมูล snapshot ล่าสุดยังคงแสดงอยู่ ระบบจะโหลดสถานะจาก Backend ใหม่เมื่อเชื่อมต่อสำเร็จ</p>}
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-end justify-between gap-4"><div><h2 className="font-semibold">ความคืบหน้าโดยรวม</h2><p className="mt-1 text-xs text-muted-foreground">ดำเนินการสำเร็จ {counts.completed} จาก {job.totalTargets} เครื่อง</p></div><strong className="text-3xl tabular-nums text-blue-600">{Math.round(completion)}%</strong></div><div className="mt-5"><DistributionProgress value={completion} label="ความคืบหน้าโดยรวม" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">เครื่องที่เสร็จสิ้น</p><p className="mt-1 font-semibold tabular-nums">{counts.completed} / {job.totalTargets}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">ความคืบหน้าการรับส่งเฉลี่ย</p><p className="mt-1 font-semibold tabular-nums">{Math.round(transfer)}%</p></div></div></section>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[["ทั้งหมด", job.totalTargets], ["สำเร็จ", counts.completed], ["กำลังดาวน์โหลด", counts.downloading], ["ไม่สำเร็จ", counts.failed], ["ออฟไลน์", counts.offline]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="border-b p-4"><h2 className="font-semibold">สถานะเครื่องปลายทาง</h2><p className="mt-1 text-xs text-muted-foreground">ตรวจสอบความคืบหน้าของ Agent แต่ละเครื่อง</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px]"><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาชื่อเครื่อง รหัส Agent หรือ IP" aria-label="ค้นหา Agent" className="h-10" /><select value={filter} onChange={(event) => { setFilter(event.target.value as AgentFilter); setPage(1); }} aria-label="กรองสถานะ Agent" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="ALL">ทุกสถานะ</option><option value="DOWNLOADING">กำลังดาวน์โหลด</option><option value="COMPLETED">สำเร็จ</option><option value="FAILED">ไม่สำเร็จ</option><option value="OFFLINE">ออฟไลน์</option></select><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="เรียง Agent" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="status">เรียง: รายการที่ต้องตรวจสอบ</option><option value="hostname">เรียง: ชื่อเครื่อง</option><option value="progress">เรียง: ความคืบหน้า</option></select></div></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Agent", "IP Address", "สถานะ", "ความคืบหน้า", "ดาวน์โหลดแล้ว", "ความเร็ว", "ข้อผิดพลาด", "อัปเดตล่าสุด"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{paginated.map((agent) => <AgentRow key={agent.agentId} agent={agent} />)}</tbody></table></div>
      <div className="divide-y md:hidden">{paginated.map((agent) => <article key={agent.agentId} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{agent.hostname}</p><p className="truncate font-mono text-xs text-muted-foreground">{agent.ipAddress ?? agent.agentId}</p></div><DistributionStatusBadge status={agent.status} /></div><DistributionProgress value={agent.progress} label={`ความคืบหน้า ${agent.hostname}`} /><div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{formatBytes(agent.downloadedBytes)} / {formatBytes(agent.totalBytes)}</span><span title={agent.updatedAt ? new Date(agent.updatedAt).toLocaleString("th-TH") : undefined}>{formatRelativeTime(agent.updatedAt)}</span></div></article>)}</div>
      {!paginated.length && <p className="p-12 text-center text-sm text-slate-500">ไม่พบ Agent ที่ตรงกับเงื่อนไข</p>}
      <footer className="flex flex-col gap-3 border-t bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><span>แถวต่อหน้า</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-md border bg-background px-2">{[25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select><span>แสดง {paginated.length} จาก {visible.length}</span></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</Button><span>หน้า {currentPage} จาก {pageCount}</span><Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button></div></footer>
    </section>
  </div>;
}

function AgentRow({ agent }: { agent: DistributionAgent }) {
  return <tr><td className="px-4 py-4"><p className="font-semibold">{agent.hostname}</p><p className="font-mono text-[10px] text-slate-400">{agent.agentId}</p></td><td className="px-4 py-4 font-mono text-xs">{agent.ipAddress ?? "-"}</td><td className="px-4 py-4"><DistributionStatusBadge status={agent.status} /></td><td className="px-4 py-4"><DistributionProgress value={agent.progress} label={`${agent.hostname} download progress`} /></td><td className="px-4 py-4 tabular-nums">{formatBytes(agent.downloadedBytes)} / {formatBytes(agent.totalBytes)}</td><td className="px-4 py-4">-</td><td className="max-w-44 px-4 py-4"><span className="block truncate text-xs font-medium text-red-600" title={agent.errorMessage ?? undefined}>{agent.errorCode ?? "-"}</span></td><td className="px-4 py-4 text-xs text-slate-500" title={agent.updatedAt ? new Date(agent.updatedAt).toLocaleString() : undefined}>{formatRelativeTime(agent.updatedAt)}</td></tr>;
}

function countStatuses(agents: DistributionAgent[]) {
  return { completed: agents.filter((agent) => agent.status === "COMPLETED").length, downloading: agents.filter((agent) => ["SENT", "DOWNLOADING", "VERIFYING", "PENDING"].includes(agent.status)).length, failed: agents.filter((agent) => agent.status === "FAILED").length, offline: agents.filter((agent) => agent.status === "OFFLINE").length };
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><dt>{label}</dt><dd className={`mt-0.5 truncate text-slate-800 dark:text-slate-200 ${mono ? "font-mono" : "font-medium"}`} title={value}>{value}</dd></div>;
}
