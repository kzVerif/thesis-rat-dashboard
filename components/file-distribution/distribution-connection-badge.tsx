import type { DistributionConnectionState } from "@/lib/file-distribution";

export function DistributionConnectionBadge({ state }: { state: DistributionConnectionState }) {
  const label = { connecting: "กำลังเชื่อมต่อ", live: "อัปเดตสด", reconnecting: "กำลังเชื่อมต่อใหม่", disconnected: "ขาดการเชื่อมต่อ" }[state];
  return <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className={`size-2 rounded-full ${state === "live" ? "animate-pulse bg-emerald-500" : state === "disconnected" ? "bg-red-500" : "bg-amber-500"}`} />{label}</span>;
}
