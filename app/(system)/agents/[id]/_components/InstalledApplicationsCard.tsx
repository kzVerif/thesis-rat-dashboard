"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterInstalledApps, formatInstallDate, formatInstalledSize, initialInstalledAppsState, installedAppsReducer, InstalledAppsController } from "@/lib/installed-apps";

export default function InstalledApplicationsCard({ agentID, hostname, online, socket }: { agentID: string; hostname: string; online: boolean; socket: WebSocket | null }) {
  const [state, dispatch] = useReducer(installedAppsReducer, initialInstalledAppsState);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const exportInProgress = useRef(false);
  const controller = useRef<InstalledAppsController | null>(null);
  useEffect(() => {
    if (!online || !socket || socket.readyState !== WebSocket.OPEN) {
      dispatch({ type: "offline" });
      return;
    }
    const current = new InstalledAppsController(socket, agentID, dispatch);
    controller.current = current;
    current.request();
    return () => {
      current.dispose();
      if (controller.current === current) controller.current = null;
    };
  }, [agentID, online, socket]);
  const pending = state.status === "loading" || state.status === "refreshing";
  const filtered = filterInstalledApps(state.apps, query);
  const exportExcel = async () => {
    if (exportInProgress.current || state.apps.length === 0 || state.status === "loading") return;
    exportInProgress.current = true;
    setExporting(true);
    try {
      const { exportInstalledAppsExcel } = await import("@/lib/installed-apps-excel");
      // Export the entire loaded snapshot, independently of the search query.
      await exportInstalledAppsExcel(state.apps, hostname);
    } catch {
      toast.error("ส่งออก Excel ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      exportInProgress.current = false;
      setExporting(false);
    }
  };
  const labels = { loading: "กำลังโหลด…", refreshing: "กำลังอัปเดต…", ready: "พร้อมใช้งาน", offline: "ออฟไลน์ / รอการเชื่อมต่อ", error: "โหลดไม่สำเร็จ", timeout: "หมดเวลารอ" };
  return (
    <section aria-labelledby="installed-applications-heading" aria-busy={pending} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-4 border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="installed-applications-heading" className="font-semibold text-slate-950 dark:text-white">Installed Applications</h2>
            <p className="mt-1 text-xs text-slate-500">
              {query.trim() ? `${filtered.length} จาก ` : ""}{state.apps.length} applications
              {state.updatedAt ? ` • อัปเดตล่าสุด ${new Date(state.updatedAt).toLocaleTimeString("th-TH")}` : " • ยังไม่มีข้อมูล"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={exporting || state.apps.length === 0 || state.status === "loading"} onClick={exportExcel}>{exporting ? "กำลัง Export…" : "Export Excel"}</Button>
            <Button type="button" size="sm" variant="outline" disabled={pending || state.status === "offline" || !online || !socket || socket.readyState !== WebSocket.OPEN} onClick={() => controller.current?.request()}>Refresh</Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อ เวอร์ชัน หรือผู้เผยแพร่…" aria-label="ค้นหา Installed Applications" className="h-9 sm:max-w-sm" />
          <span role="status" className="text-xs text-slate-500">{labels[state.status]}</span>
        </div>
        {state.error && <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">{state.error}</p>}
        {state.updatedAt && state.status !== "ready" && <p className="text-xs text-slate-500">แสดงข้อมูลจากการโหลดสำเร็จครั้งล่าสุด</p>}
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950">
            <tr>{["Application", "Version", "Publisher", "Installed", "Size"].map(title => <th key={title} className="px-5 py-3 font-medium">{title}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((app, index) => <tr key={`${index}:${app.name}:${app.version ?? ""}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              <td className="max-w-xs break-words px-5 py-3 font-medium text-slate-900 dark:text-white">{app.name}</td>
              <td className="max-w-40 break-words px-5 py-3 text-slate-500">{app.version || "—"}</td>
              <td className="max-w-48 break-words px-5 py-3 text-slate-500">{app.publisher || "—"}</td>
              <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatInstallDate(app.install_date)}</td>
              <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatInstalledSize(app.estimated_size_kb)}</td>
            </tr>)}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-10 text-center text-sm text-slate-500">
          {query.trim() && state.apps.length ? "ไม่พบโปรแกรมที่ตรงกับคำค้นหา" : state.status === "loading" ? "กำลังอ่านรายชื่อโปรแกรมจาก Agent…" : state.updatedAt ? "ไม่พบโปรแกรมที่ติดตั้งสำหรับทุกผู้ใช้" : state.status === "offline" ? "เชื่อมต่อ Agent เพื่อโหลดรายชื่อโปรแกรม" : "ยังโหลดรายชื่อโปรแกรมไม่สำเร็จ"}
        </p>}
      </div>
    </section>
  );
}
