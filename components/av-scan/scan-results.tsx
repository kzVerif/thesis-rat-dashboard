"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { exportScanReport } from "@/lib/scan-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScanSnapshot } from "@/app/(system)/av-scans/_lib/types";
import { isTerminal, jobFinished, type ScanRow, type ScanStatus } from "@/lib/virus-scan";
import { AvScanRealtimeClient } from "@/lib/av-scan-realtime";
import { panelClass, ScanBadge } from "./scan-shared";

const statusLabels = {
  QUEUED: "ยังไม่มีหลักฐานการส่ง (QUEUED)",
  DELIVERED: "ส่งคำสั่งแล้ว (DELIVERED)",
  RUNNING: "กำลังสแกน (RUNNING)",
  SUCCEEDED: "สแกนเสร็จแล้ว (COMPLETED)",
  FAILED: "สแกนไม่สำเร็จ (FAILED)",
  CANCELLED: "ยกเลิกแล้ว (CANCELLED)",
  EXPIRED: "หมดอายุ (EXPIRED)",
};

const PAGE_SIZE = 10;

function Pagination({
  label,
  total,
  page,
  onChange,
}: {
  label: string;
  total: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <nav
      aria-label={label}
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-muted-foreground" role="status">
        {total
          ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`
          : "0"}{" "}
        จาก {total} รายการ
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label={`${label}: หน้าก่อนหน้า`}
          >
            ก่อนหน้า
          </Button>
          <span className="text-xs tabular-nums">
            {page} / {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
            aria-label={`${label}: หน้าถัดไป`}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </nav>
  );
}

function date(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}
function Report({ target }: { target: ScanRow }) {
  const result = target.result;
  const report =
    result?.report && typeof result.report === "object"
      ? (result.report as Record<string, unknown>)
      : null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
        แสดงรายละเอียด
      </summary>
      <div className="mt-3 space-y-2">
        <p className="break-all">Request / Command ID: {target.request_id}</p>
        <p>สร้าง: {date(target.created_at)}</p>
        <p>เริ่ม: {date(target.started_at)}</p>
        <p>สิ้นสุด: {date(target.finished_at)}</p>
        {target.message && (
          <p className="whitespace-pre-wrap break-words">{target.message}</p>
        )}
        {typeof result?.status === "string" && (
          <p>ผลจาก Agent: {result.status}</p>
        )}
        {result?.error != null && (
          <pre className="whitespace-pre-wrap break-all text-destructive">
            {typeof result.error === "string"
              ? result.error
              : JSON.stringify(result.error, null, 2)}
          </pre>
        )}
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="font-medium">Output จาก Agent</p>
          <p>
            Exit code:{" "}
            {typeof report?.exit_code === "number"
              ? report.exit_code
              : "ไม่มีข้อมูล"}
          </p>
          {typeof report?.output === "string" ? (
            report.output.length > 0 ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono">
                {report.output}
              </pre>
            ) : (
              <p className="text-muted-foreground">
                Agent ส่ง output ว่างกลับมา
              </p>
            )
          ) : (
            <p className="text-muted-foreground">
              ยังไม่มี output จาก Agent ในข้อมูลผลสแกนนี้
            </p>
          )}
          {report?.output_truncated === true && (
            <p className="text-amber-600 dark:text-amber-400">
              รายงานถูกตัดทอนจาก Agent
            </p>
          )}
        </div>
        {result && (
          <details>
            <summary className="cursor-pointer text-muted-foreground">
              ข้อมูลผลล่าสุดทั้งหมด
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}
        {!result && (
          <p className="text-muted-foreground">ยังไม่ได้รับรายงานจากเครื่อง</p>
        )}
      </div>
    </details>
  );
}

export function ScanResults({
  snapshot,
}: {
  snapshot: ScanSnapshot;
}) {
  const [client] = useState(() => new AvScanRealtimeClient(
    process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "",
    url => new WebSocket(url || `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/frontend`),
  ));
  useEffect(() => client.start(), [client]);
  const { jobs, summary, connection, loading, active, error, updatedAt } = useSyncExternalStore(
    client.subscribe, client.getSnapshot, client.getSnapshot,
  );
  const [exportingExcel, setExportingExcel] = useState(false);
  const refresh = client.refresh;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ScanStatus | "all">("all");
  const [jobQuery, setJobQuery] = useState("");
  const [jobPage, setJobPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const filteredJobs = jobs.filter((j) =>
    [j.id, j.mode, j.path]
      .join(" ")
      .toLowerCase()
      .includes(jobQuery.trim().toLowerCase()),
  );
  const currentJobPage = Math.min(
    jobPage,
    Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE)),
  );
  const pagedJobs = filteredJobs.slice(
    (currentJobPage - 1) * PAGE_SIZE,
    currentJobPage * PAGE_SIZE,
  );
  const job = jobs.find((j) => j.id === selectedId) ?? jobs[0];
  const computers = new Map(snapshot.computers.map((c) => [c.id, c]));
  const visible =
    job?.targets.filter((t) => {
      const computer = computers.get(t.agent_id);
      return (
        (status === "all" || t.status === status) &&
        [
          computer?.hostname,
          computer?.ip,
          computer?.room,
          t.agent_id,
          t.request_id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    }) ?? [];
  const currentResultPage = Math.min(
    resultPage,
    Math.max(1, Math.ceil(visible.length / PAGE_SIZE)),
  );
  const pagedResults = visible.slice(
    (currentResultPage - 1) * PAGE_SIZE,
    currentResultPage * PAGE_SIZE,
  );
  const stats = [
    { label: "งานในประวัติที่โหลด", value: summary.loaded_jobs },
    {
      label: "ผลที่ยังไม่สิ้นสุด",
      value: summary.pending_results,
    },
    {
      label: "ผลสแกนที่สำเร็จ",
      value: summary.succeeded_results,
    },
    {
      label: "ผลสแกนที่ไม่สำเร็จ",
      value: summary.failed_results,
    },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold">ติดตามผล AV Scan</h1>
        <p className="text-sm text-muted-foreground">
          ผลสแกนรายเครื่อง อัปเดตอัตโนมัติแบบ realtime
        </p>
        <nav aria-label="AV Scan" className="flex gap-2 border-b pb-4">
          <Button asChild variant="ghost">
            <Link href="/av-scans">สั่ง AV Scan</Link>
          </Button>
          <Button asChild>
            <Link href="/av-scans/results" aria-current="page">
              ติดตามผลการสแกน
            </Link>
          </Button>
        </nav>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" role="status">
          {connection === "reconnecting" ? "ขาดการเชื่อมต่อ กำลังเชื่อมต่อใหม่…"
            : loading ? "กำลังเชื่อมต่อและรอผลสแกน…"
            : active ? "เชื่อมต่อ realtime แล้ว" : "หยุดรับข้อมูล realtime"} •
          อัปเดตล่าสุด {date(updatedAt)}
        </p>
        <Button variant="outline" disabled={loading} onClick={refresh}>
          {loading ? "กำลังโหลด…" : "เชื่อมต่อ / โหลดใหม่"}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 p-4 text-sm text-destructive"
        >
          {error}
          {updatedAt && " • แสดงข้อมูลจากการโหลดสำเร็จครั้งก่อน"}
        </p>
      )}
      {!active && updatedAt && (
        <p role="status" className="text-sm text-amber-600 dark:text-amber-400">
          ข้อมูลที่แสดงเป็นข้อมูลล่าสุดที่ได้รับ และยังไม่อัปเดตจนกว่าจะเชื่อมต่อสำเร็จ
          การขาดการเชื่อมต่อไม่ได้หมายความว่าสแกนล้มเหลว
        </p>
      )}
      {snapshot.error && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          โหลดชื่อเครื่องไม่สำเร็จ: {snapshot.error} • แสดง Agent ID แทน
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={panelClass}>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {s.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">
              {updatedAt ? s.value : "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        แสดงงานล่าสุดของคุณสูงสุด 100 งาน พร้อมผลทุกเครื่องในแต่ละงาน แบ่งแสดงหน้าละ 10 รายการ
        ยอดสรุปนับเฉพาะงานที่โหลดมา โดยผลไม่สำเร็จรวมยกเลิกและหมดอายุ
      </p>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={panelClass + " h-fit"}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">รายการงาน</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/av-scans">สร้างงาน</Link>
            </Button>
          </div>
          <Input
            className="mb-4"
            aria-label="ค้นหางานสแกน"
            placeholder="ค้นหา Job ID หรือประเภทสแกน"
            value={jobQuery}
            onChange={(e) => {
              setJobQuery(e.target.value);
              setJobPage(1);
            }}
          />
          <div className="max-h-[600px] space-y-3 overflow-y-auto">
            {pagedJobs.map((j) => (
              <button
                key={j.id}
                aria-pressed={j.id === job?.id}
                onClick={() => {
                  setSelectedId(j.id);
                  setQuery("");
                  setStatus("all");
                  setResultPage(1);
                }}
                className={
                  "w-full rounded-xl border p-3 text-left transition-colors " +
                  (j.id === job?.id
                    ? "border-blue-500 bg-blue-500/5"
                    : "hover:bg-muted/50")
                }
              >
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {j.mode.toUpperCase()} SCAN
                </span>
                <span className="mt-2 block break-all font-mono text-xs">
                  {j.id}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {j.targets.length} ผลสแกน
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {date(j.createdAt)}
                </span>
                <span className="mt-3 block text-xs">
                  {j.targets.length === 0 ? "ไม่มีผลรายเครื่อง" : jobFinished(j)
                    ? "สิ้นสุดแล้วทุกเครื่อง"
                    : "มีผลที่รอดำเนินการ / กำลังสแกน"}
                </span>
              </button>
            ))}
          </div>
          {!filteredJobs.length && jobQuery && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ไม่พบงานที่ตรงกับคำค้นหา
            </p>
          )}
          <Pagination
            label="หน้ารายการงาน"
            total={filteredJobs.length}
            page={currentJobPage}
            onChange={setJobPage}
          />
        </aside>
        {job ? (
          <section className={panelClass + " min-w-0 space-y-5"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {job.mode.toUpperCase()} Scan
                </h2>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  Job ID: {job.id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={exportingExcel || !job.targets.length}
                  onClick={async () => {
                    setExportingExcel(true);
                    try {
                      const { exportScanExcel } = await import("@/lib/scan-excel");
                      await exportScanExcel(job, snapshot.computers);
                    } catch {
                      toast.error("ส่งออก Excel ไม่สำเร็จ กรุณาลองอีกครั้ง");
                    } finally {
                      setExportingExcel(false);
                    }
                  }}
                >
                  {exportingExcel ? "กำลังส่งออก..." : "Export Excel"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      exportScanReport(job, snapshot.computers);
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "เปิดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง",
                      );
                    }
                  }}
                >
                  Export PDF
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Export Excel และ PDF รวมผลที่โหลดได้ทั้งหมดของงานนี้
              ไม่จำกัดตามตัวกรองหรือหน้าตาราง โดย Excel ดาวน์โหลดเป็นไฟล์ .xlsx
              ส่วน PDF ให้เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์
            </p>
            {job.path && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 font-medium">เส้นทางสแกน</p>
                <p className="break-all font-mono">{job.path}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 rounded-xl border bg-muted/30 p-4 text-sm">
              <span>
                สแกนเสร็จ{" "}
                {job.targets.filter((t) => t.status === "SUCCEEDED").length}
              </span>
              <span>
                ไม่สำเร็จ{" "}
                {job.targets.filter((t) => t.status === "FAILED").length}
              </span>
              <span>
                ยกเลิก / หมดอายุ{" "}
                {
                  job.targets.filter(
                    (t) => t.status === "CANCELLED" || t.status === "EXPIRED",
                  ).length
                }
              </span>
              <span>
                ยังไม่ได้รับผล{" "}
                {job.targets.filter((t) => !isTerminal(t.status)).length}
              </span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              สแกนสำเร็จไม่ได้ยืนยันว่าไม่พบไวรัส โปรดอ่าน Output จาก Agent
              ระบบนี้ไม่รายงานจำนวนไฟล์หรือจำนวนภัยคุกคาม
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="ค้นหาผลสแกนรายเครื่อง"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setResultPage(1);
                }}
                placeholder="ค้นหาชื่อเครื่อง, IP, ห้อง หรือ Request ID"
              />
              <select
                aria-label="กรองสถานะสแกน"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ScanStatus | "all");
                  setResultPage(1);
                }}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">ทุกสถานะ</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <caption className="sr-only">
                  สถานะและรายงานสแกนรายเครื่อง
                </caption>
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">
                      เครื่อง / ห้อง
                    </th>
                    <th scope="col" className="p-3">
                      สถานะ / รายงาน
                    </th>
                    <th scope="col" className="p-3">
                      เวลาสิ้นสุด
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedResults.map((t) => {
                    const computer = computers.get(t.agent_id);
                    return (
                      <tr
                        key={t.request_id}
                        className="border-b align-top last:border-0"
                      >
                        <td className="max-w-60 p-3">
                          <p className="break-all font-medium">
                            {computer?.hostname ?? t.agent_id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {computer?.ip ?? "ไม่มีข้อมูล IP"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {computer?.room ?? "ไม่มีข้อมูลห้อง"}
                          </p>
                        </td>
                        <td className="max-w-lg p-3">
                          <ScanBadge
                            status={t.status}
                            label={
                              statusLabels[
                                t.status as keyof typeof statusLabels
                              ]
                            }
                          />
                          {!isTerminal(t.status) && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              ยังไม่ได้รับผลสุดท้าย
                            </p>
                          )}
                          {t.message && (
                            <p className="mt-2 whitespace-pre-wrap break-words text-xs">
                              {t.message}
                            </p>
                          )}
                          <Report target={t} />
                        </td>
                        <td className="p-3 text-xs">{date(t.finished_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              label="หน้าผลสแกนรายเครื่อง"
              total={visible.length}
              page={currentResultPage}
              onChange={setResultPage}
            />
            {!visible.length && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  ไม่พบเครื่องที่ตรงกับตัวกรอง
                </p>
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setResultPage(1);
                  }}
                >
                  ล้างตัวกรอง
                </Button>
              </div>
            )}
          </section>
        ) : (
          <div
            className={
              panelClass + " h-fit text-center text-sm text-muted-foreground"
            }
          >
            {loading || connection === "reconnecting"
              ? "กำลังรอข้อมูลผลสแกน…"
              : error ? "โหลดผลสแกนไม่สำเร็จ กดเชื่อมต่อ / โหลดใหม่เพื่อลองอีกครั้ง"
              : "ยังไม่มีผลสแกน"}
          </div>
        )}
      </div>
    </div>
  );
}
