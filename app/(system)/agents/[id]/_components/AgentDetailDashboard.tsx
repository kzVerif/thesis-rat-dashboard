"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ComputerIcon,
  MeetingRoomIcon,
  ShutDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  refreshAgentAction,
  shutdownAgentAction,
} from "@/actions/agent-detail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  AgentDetail,
  AgentProcess,
  AgentStatus,
  PerformanceSample,
} from "../_lib/types";

type PerformanceConnection = "connecting" | "live" | "reconnecting" | "offline" | "error";

const performanceSocketUrl =
  process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "ws://localhost:8081/ws/frontend";

export default function AgentDetailDashboard({
  initialAgent,
}: {
  initialAgent: AgentDetail;
}) {
  const [agent, setAgent] = useState(initialAgent);
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [killTarget, setKillTarget] = useState<AgentProcess | null>(null);
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [performanceConnection, setPerformanceConnection] =
    useState<PerformanceConnection>(initialAgent.status === "ONLINE" ? "connecting" : "offline");
  const [processConnection, setProcessConnection] =
    useState<PerformanceConnection>(initialAgent.status === "ONLINE" ? "connecting" : "offline");
  const [processUpdatedAt, setProcessUpdatedAt] = useState<string | null>(null);
  const [processQuery, setProcessQuery] = useState("");
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<WebSocket | null>(null);
  const online = agent.status === "ONLINE";
  const normalizedProcessQuery = processQuery.trim().toLocaleLowerCase();
  const filteredProcesses = normalizedProcessQuery
    ? agent.processes.filter((process) =>
        process.name.toLocaleLowerCase().includes(normalizedProcessQuery)
        || String(process.pid).includes(normalizedProcessQuery),
      )
    : agent.processes;

  useEffect(() => {
    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await refreshAgentAction(agent.id);
        if (result.ok) {
          setAgent((current) => ({
            ...result.data,
            performance: current.performance,
            processes: current.processes,
            measuredAt: current.measuredAt,
          }));
        }
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [agent.id]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let retryCount = 0;
    let disposed = false;

    const subscribe = () => {
      if (disposed) return;

      setPerformanceConnection(retryCount === 0 ? "connecting" : "reconnecting");
      setProcessConnection(retryCount === 0 ? "connecting" : "reconnecting");
      socket = new WebSocket(performanceSocketUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        retryCount = 0;
        setPerformanceError(null);
        socket?.send(JSON.stringify({
          type: "performance",
          action: "start",
          agent_id: initialAgent.id,
        }));
        socket?.send(JSON.stringify({
          type: "process",
          action: "start",
          agent_id: initialAgent.id,
        }));
      });

      socket.addEventListener("message", (event) => {
        let message: unknown;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (isProcessList(message)) {
          setAgent((current) => ({ ...current, processes: message }));
          setProcessUpdatedAt(new Date().toISOString());
          setProcessConnection("live");
          return;
        }

        if (!isSocketMessage(message)) return;

        if (message.type === "error") {
          setPerformanceConnection("error");
          setProcessConnection("error");
          setPerformanceError(
            typeof message.error === "string" ? message.error : "ไม่สามารถอ่านข้อมูล Performance ได้",
          );
          return;
        }

        if (message.agent_id !== initialAgent.id) return;

        if (message.type === "subscribed") {
          if (message.stream === "process") {
            setProcessConnection("live");
          } else {
            setPerformanceConnection("live");
          }
          return;
        }

        if (message.type === "process" && message.action === "kill_accepted") {
          if (typeof message.pid === "number") setKillingPid(message.pid);
          return;
        }

        if (message.type === "process" && message.action === "kill_result") {
          if (typeof message.pid !== "number" || typeof message.success !== "boolean") return;

          setKillingPid((current) => current === message.pid ? null : current);
          if (message.success) {
            setAgent((current) => ({
              ...current,
              processes: current.processes.filter((process) => process.pid !== message.pid),
            }));
            toast.success("หยุด Process สำเร็จ", { description: `PID ${message.pid}` });
          } else {
            toast.error("หยุด Process ไม่สำเร็จ", {
              description: typeof message.error === "string" ? message.error : `PID ${message.pid}`,
            });
          }
          return;
        }

        if ((message.type === "process" || message.type === "processes") && isProcessList(message.data)) {
          const processes = message.data;
          setAgent((current) => ({ ...current, processes }));
          setProcessUpdatedAt(
            typeof message.received_at === "string" ? message.received_at : new Date().toISOString(),
          );
          setProcessConnection("live");
          return;
        }

        if (message.type === "performance" && isPerformanceSample(message.data)) {
          const sample = message.data;
          setPerformanceConnection("live");
          setPerformanceError(null);
          setAgent((current) => ({
            ...current,
            status: "ONLINE",
            lastSeen: typeof message.received_at === "string"
              ? message.received_at
              : current.lastSeen,
            performance: {
              cpu: sample.cpu_usage,
              ram: {
                usedGb: sample.ram_used_gb,
                totalGb: sample.ram_total_gb,
                percent: sample.ram_usage,
              },
              disk: {
                usedGb: sample.disk_used_gb,
                totalGb: sample.disk_total_gb,
                freeGb: sample.disk_free_gb,
                percent: sample.disk_usage,
              },
            },
            measuredAt: typeof message.received_at === "string"
              ? message.received_at
              : new Date().toISOString(),
          }));
          return;
        }

        if (message.type === "agent_status" && message.status === "offline") {
          setPerformanceConnection("offline");
          setProcessConnection("offline");
          setAgent((current) => ({
            ...current,
            status: "OFFLINE",
            lastSeen: new Date().toISOString(),
            performance: {
              ...current.performance,
              cpu: 0,
              ram: { ...current.performance.ram, usedGb: 0, percent: 0 },
            },
            processes: [],
          }));
          return;
        }

      });

      socket.addEventListener("close", () => {
        if (disposed) return;
        if (socketRef.current === socket) socketRef.current = null;
        setKillingPid(null);
        retryCount += 1;
        setPerformanceConnection("reconnecting");
        setProcessConnection("reconnecting");
        const delay = Math.min(1_000 * 2 ** (retryCount - 1), 15_000);
        reconnectTimer = window.setTimeout(subscribe, delay);
      });

      socket.addEventListener("error", () => {
        setPerformanceError("เชื่อมต่อ Performance WebSocket ไม่สำเร็จ");
        setProcessConnection("error");
      });
    };

    subscribe();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "performance",
          action: "stop",
          agent_id: initialAgent.id,
        }));
        socket.send(JSON.stringify({
          type: "process",
          action: "stop",
          agent_id: initialAgent.id,
        }));
      }
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [initialAgent.id]);

  const killProcess = () => {
    if (!killTarget) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error("ยังไม่สามารถส่งคำสั่งหยุด Process ได้", {
        description: "WebSocket ยังไม่ได้เชื่อมต่อ",
      });
      return;
    }

    setKillingPid(killTarget.pid);
    socket.send(JSON.stringify({
      type: "process",
      action: "kill",
      agent_id: agent.id,
      pid: killTarget.pid,
    }));
    setKillTarget(null);
  };

  const shutdown = () => {
    startTransition(async () => {
      const result = await shutdownAgentAction(agent.id);
      if (!result.ok) {
        toast.error("ส่งคำสั่งปิดเครื่องไม่สำเร็จ", { description: result.error });
        return;
      }
      toast.success("ส่งคำสั่งปิดเครื่องแล้ว", { description: agent.name });
      setAgent((current) => ({
        ...current,
        status: "OFFLINE",
        lastSeen: new Date().toISOString(),
        processes: [],
        performance: {
          ...current.performance,
          cpu: 0,
          ram: { ...current.performance.ram, usedGb: 0, percent: 0 },
        },
      }));
      setShutdownOpen(false);
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/agents" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← กลับไปหน้า Agents
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <HugeiconsIcon icon={ComputerIcon} className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{agent.name}</h1>
                <StatusBadge status={agent.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{agent.id} • {agent.ip ?? "—"}</p>
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          disabled={!online || isPending}
          onClick={() => setShutdownOpen(true)}
        >
          <HugeiconsIcon icon={ShutDownIcon} className="size-4" />
          ปิดเครื่อง
        </Button>
      </header>

      <section aria-labelledby="performance-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="performance-heading" className="font-semibold text-slate-950 dark:text-white">Performance</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              อัปเดตล่าสุด {formatMeasuredAt(agent.measuredAt)}
            </p>
          </div>
          <PerformanceConnectionBadge state={performanceConnection} />
        </div>
        {performanceError && (
          <p role="status" className="text-xs text-amber-600 dark:text-amber-400">{performanceError}</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
        <PerformanceCard label="CPU" value={agent.performance.cpu} detail="Processor usage" tone="blue" />
        <PerformanceCard
          label="RAM"
          value={agent.performance.ram.percent}
          detail={formatUsage(agent.performance.ram.usedGb, agent.performance.ram.totalGb)}
          tone="violet"
          wholeNumber
        />
        <PerformanceCard
          label="DISK"
          value={agent.performance.disk.percent}
          detail={`${formatUsage(agent.performance.disk.usedGb, agent.performance.disk.totalGb)}${agent.performance.disk.freeGb === null ? "" : ` • ว่าง ${formatGb(agent.performance.disk.freeGb)} GB`}`}
          tone="emerald"
        />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Process ที่กำลังทำงาน</h2>
              <p className="mt-1 text-xs text-slate-500">
                {online
                  ? `${normalizedProcessQuery ? `${filteredProcesses.length} จาก ` : ""}${agent.processes.length} processes • ${processUpdatedAt ? `อัปเดตล่าสุด ${formatMeasuredAt(processUpdatedAt)}` : "กำลังรอข้อมูลครั้งแรก"}`
                  : "Agent ออฟไลน์"}
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                type="search"
                value={processQuery}
                onChange={(event) => setProcessQuery(event.target.value)}
                placeholder="ค้นหาชื่อหรือ PID..."
                aria-label="ค้นหา Process ด้วยชื่อหรือ PID"
                className="h-9 min-w-0 sm:w-56"
              />
              <PerformanceConnectionBadge state={processConnection} />
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 shadow-[0_1px_0_rgb(226_232_240)] dark:bg-slate-950 dark:shadow-[0_1px_0_rgb(30_41_59)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Process</th>
                  <th className="px-4 py-3 font-medium">PID</th>
                  <th className="px-5 py-3 text-right font-medium">คำสั่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProcesses.map((process) => (
                  <tr key={process.pid} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{process.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{process.pid}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={!online || processConnection !== "live" || killingPid !== null}
                        onClick={() => setKillTarget(process)}
                      >
                        {killingPid === process.pid ? "กำลังหยุด..." : "หยุด"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProcesses.length === 0 && (
              <p className="p-10 text-center text-sm text-slate-500">
                {normalizedProcessQuery && agent.processes.length > 0
                  ? `ไม่พบ Process ที่ตรงกับ “${processQuery.trim()}”`
                  : online && processConnection !== "live"
                  ? "กำลังรอรายการ Process จาก Agent..."
                  : online
                    ? "ไม่พบ Process ที่กำลังทำงาน"
                    : "ไม่สามารถอ่าน Process ขณะ Agent ออฟไลน์"}
              </p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-950 dark:text-white">ข้อมูลเครื่อง</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <Info label="ห้อง">
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon icon={MeetingRoomIcon} className="size-4 text-blue-500" />
                {agent.room?.name ?? "ยังไม่จัดห้อง"}
              </span>
            </Info>
            <Info label="Operating system">{agent.os}</Info>
            <Info label="IP address"><span className="font-mono">{agent.ip ?? "—"}</span></Info>
            <Info label="MAC address"><span className="font-mono">{agent.macAddress ?? "—"}</span></Info>
            <Info label="Last seen">{formatDateTime(agent.lastSeen)}</Info>
            <Info label="วัดข้อมูลล่าสุด">
              {formatMeasuredAt(agent.measuredAt)}
            </Info>
          </dl>
        </aside>
      </section>

      <Dialog open={shutdownOpen} onOpenChange={setShutdownOpen}>
        <DialogContent className="font-kanit sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการปิดเครื่อง</DialogTitle>
            <DialogDescription>
              ระบบจะส่งคำสั่งปิดเครื่องไปยัง {agent.name} การเชื่อมต่อจะสิ้นสุดทันที
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShutdownOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={isPending} onClick={shutdown}>
              <HugeiconsIcon icon={ShutDownIcon} className="size-4" />
              ยืนยันปิดเครื่อง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={killTarget !== null} onOpenChange={(open) => !open && setKillTarget(null)}>
        <DialogContent className="font-kanit sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการหยุด Process</DialogTitle>
            <DialogDescription>
              ต้องการหยุด {killTarget?.name} (PID {killTarget?.pid}) บน {agent.name} ใช่หรือไม่
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={killProcess}>ยืนยันหยุด Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const variants = {
    ONLINE: ["Online", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", "bg-emerald-500"],
    OFFLINE: ["Offline", "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", "bg-slate-400"],
    WARNING: ["Warning", "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", "bg-amber-500"],
    DISABLED: ["Disabled", "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", "bg-red-500"],
  } satisfies Record<AgentStatus, [string, string, string]>;
  const [label, className, dotClassName] = variants[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <span className={`size-2 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}

function PerformanceCard({
  label,
  value,
  detail,
  tone,
  wholeNumber = false,
}: {
  label: string;
  value: number | null;
  detail: string;
  tone: "blue" | "violet" | "emerald";
  wholeNumber?: boolean;
}) {
  const colors = {
    blue: "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgb(59_130_246_/_0.35)]",
    violet: "bg-gradient-to-r from-violet-600 to-fuchsia-400 shadow-[0_0_10px_rgb(124_58_237_/_0.35)]",
    emerald: "bg-gradient-to-r from-emerald-600 to-teal-400 shadow-[0_0_10px_rgb(5_150_105_/_0.35)]",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-end justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>
        <p className="text-3xl font-bold text-slate-950 dark:text-white">
          {value === null ? "—" : `${wholeNumber ? Math.max(0, Math.round(value)) : formatPercent(value)}%`}
        </p>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/50"
        role="progressbar"
        aria-label={`${label} usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(Math.min(100, Math.max(0, value)))}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-out will-change-[width] motion-reduce:transition-none ${colors[tone]}`}
          style={{ width: `${value === null ? 0 : Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function PerformanceConnectionBadge({ state }: { state: PerformanceConnection }) {
  const content = {
    connecting: ["กำลังเชื่อมต่อ", "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"],
    live: ["Live", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"],
    reconnecting: ["กำลังเชื่อมต่อใหม่", "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"],
    offline: ["Agent offline", "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"],
    error: ["เกิดข้อผิดพลาด", "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"],
  } satisfies Record<PerformanceConnection, [string, string]>;
  const [label, className] = content[state];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <span className={`size-2 rounded-full ${state === "live" ? "animate-pulse bg-emerald-500" : "bg-current opacity-60"}`} />
      {label}
    </span>
  );
}

function isSocketMessage(value: unknown): value is Record<string, unknown> & { type: string; agent_id?: string } {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function isPerformanceSample(value: unknown): value is PerformanceSample {
  if (typeof value !== "object" || value === null) return false;
  const sample = value as Record<keyof PerformanceSample, unknown>;
  return [
    "cpu_usage",
    "ram_total_gb",
    "ram_used_gb",
    "ram_usage",
    "disk_total_gb",
    "disk_used_gb",
    "disk_free_gb",
    "disk_usage",
  ].every((key) => typeof sample[key as keyof PerformanceSample] === "number");
}

function isProcessList(value: unknown): value is AgentProcess[] {
  return Array.isArray(value) && value.every((process) => {
    if (typeof process !== "object" || process === null) return false;
    const item = process as { pid?: unknown; name?: unknown };
    return Number.isInteger(item.pid) && typeof item.name === "string" && item.name.length > 0;
  });
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);
}

function formatGb(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function formatUsage(used: number | null, total: number | null) {
  return used === null || total === null ? "รอข้อมูลจาก Agent" : `${formatGb(used)} / ${formatGb(total)} GB`;
}

function formatMeasuredAt(value: string | null) {
  if (!value) return "รอข้อมูล";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "medium" });
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{children}</dd></div>;
}
