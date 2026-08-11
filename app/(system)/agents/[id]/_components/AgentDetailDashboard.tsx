"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
  stopAgentProcessAction,
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
import type { AgentDetail, AgentProcess } from "../_lib/types";

export default function AgentDetailDashboard({
  initialAgent,
}: {
  initialAgent: AgentDetail;
}) {
  const [agent, setAgent] = useState(initialAgent);
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [stoppingPid, setStoppingPid] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const online = agent.status === "online";

  useEffect(() => {
    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await refreshAgentAction(agent.id);
        if (result.ok) setAgent(result.data);
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [agent.id]);

  const stopProcess = (process: AgentProcess) => {
    setStoppingPid(process.pid);
    startTransition(async () => {
      const result = await stopAgentProcessAction(agent.id, process.pid);
      if (!result.ok) {
        toast.error("หยุด Process ไม่สำเร็จ", { description: result.error });
      } else {
        setAgent((current) => ({
          ...current,
          processes: current.processes.filter((item) => item.pid !== process.pid),
        }));
        toast.success("ส่งคำสั่งหยุด Process แล้ว", {
          description: `${process.name} • PID ${process.pid}`,
        });
      }
      setStoppingPid(null);
    });
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
        status: "offline",
        lastSeen: "เพิ่งออฟไลน์",
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
                <StatusBadge online={online} />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{agent.id} • {agent.ip}</p>
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

      <section className="grid gap-4 md:grid-cols-3">
        <PerformanceCard label="CPU" value={agent.performance.cpu} detail="Processor usage" tone="blue" />
        <PerformanceCard
          label="RAM"
          value={agent.performance.ram.percent}
          detail={`${agent.performance.ram.usedGb} / ${agent.performance.ram.totalGb} GB`}
          tone="violet"
        />
        <PerformanceCard
          label="DISK"
          value={agent.performance.disk.percent}
          detail={`${agent.performance.disk.usedGb} / ${agent.performance.disk.totalGb} GB`}
          tone="emerald"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Process ที่กำลังทำงาน</h2>
              <p className="mt-1 text-xs text-slate-500">
                {online ? `${agent.processes.length} processes • อัปเดตทุก 10 วินาที` : "Agent ออฟไลน์"}
              </p>
            </div>
            {isPending && <span className="text-xs text-blue-600">กำลังอัปเดต...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950/40">
                <tr>
                  <th className="px-5 py-3 font-medium">Process</th>
                  <th className="px-4 py-3 font-medium">PID</th>
                  <th className="px-4 py-3 font-medium">CPU</th>
                  <th className="px-4 py-3 font-medium">Memory</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-5 py-3 text-right font-medium">คำสั่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agent.processes.map((process) => (
                  <tr key={process.pid}>
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{process.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{process.pid}</td>
                    <td className="px-4 py-4">{process.cpu.toFixed(1)}%</td>
                    <td className="px-4 py-4">{process.memoryMb} MB</td>
                    <td className="px-4 py-4 text-slate-500">{process.user}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!online || stoppingPid === process.pid}
                        onClick={() => stopProcess(process)}
                      >
                        {stoppingPid === process.pid ? "กำลังหยุด..." : "หยุด Process"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agent.processes.length === 0 && (
              <p className="p-10 text-center text-sm text-slate-500">
                {online ? "ไม่พบ Process ที่กำลังทำงาน" : "ไม่สามารถอ่าน Process ขณะ Agent ออฟไลน์"}
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
            <Info label="IP address"><span className="font-mono">{agent.ip}</span></Info>
            <Info label="MAC address"><span className="font-mono">{agent.macAddress}</span></Info>
            <Info label="Last seen">{agent.lastSeen}</Info>
            <Info label="วัดข้อมูลล่าสุด">
              {new Date(agent.measuredAt).toLocaleTimeString("th-TH")}
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
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      online
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    }`}>
      <span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

function PerformanceCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "blue" | "violet" | "emerald";
}) {
  const colors = {
    blue: "bg-blue-600",
    violet: "bg-violet-600",
    emerald: "bg-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-end justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>
        <p className="text-3xl font-bold text-slate-950 dark:text-white">{value}%</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{children}</dd></div>;
}
