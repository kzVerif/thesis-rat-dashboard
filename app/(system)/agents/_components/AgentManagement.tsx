"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import {
  ArrowRight01Icon,
  ComputerIcon,
  Delete02Icon,
  Edit03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

type Agent = {
  id: string;
  name: string;
  room: string;
  macAddress: string;
  ip: string;
  os: string;
  status: "online" | "offline";
  lastOnline: string;
};

type AgentFormData = Omit<Agent, "id" | "status" | "lastOnline">;

const rooms = ["ยังไม่จัดห้อง", "ห้องปฏิบัติการ 1", "ห้องปฏิบัติการ 2", "ห้องพักครู"];
const operatingSystems = ["Windows 11 Pro", "Windows 10 Pro", "Ubuntu 24.04", "macOS 15"];

const initialAgents: Agent[] = Array.from({ length: 12 }, (_, index) => ({
  id: `agent-${index + 1}`,
  name: `PC-LAB-${String(index + 1).padStart(2, "0")}`,
  room: index < 5 ? rooms[1] : index < 9 ? rooms[2] : index < 11 ? rooms[3] : rooms[0],
  macAddress: `00:1B:44:11:3A:${String(10 + index).padStart(2, "0")}`,
  ip: `192.168.1.${101 + index}`,
  os: operatingSystems[index % operatingSystems.length],
  status: index % 4 === 0 ? "offline" : "online",
  lastOnline:
    index % 4 === 0
      ? `${5 + index * 3} นาทีที่แล้ว`
      : "ออนไลน์อยู่ขณะนี้",
}));

export default function AgentManagement() {
  const [agents, setAgents] = useState(initialAgents);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);

  const visibleAgents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return agents;
    return agents.filter((agent) =>
      [
        agent.name,
        agent.room,
        agent.macAddress,
        agent.ip,
        agent.os,
        agent.status,
        agent.lastOnline,
      ].some((value) => value.toLocaleLowerCase().includes(normalized))
    );
  }, [agents, query]);

  const handleEdit = (updated: AgentFormData) => {
    if (!editing) return;
    setAgents((current) =>
      current.map((agent) =>
        agent.id === editing.id ? { ...agent, ...updated } : agent
      )
    );
    setEditing(null);
    toast.success("แก้ไข Agent เรียบร้อยแล้ว", { description: updated.name });
  };

  const handleDelete = () => {
    if (!deleting) return;
    setAgents((current) => current.filter((agent) => agent.id !== deleting.id));
    toast.success("ลบ Agent เรียบร้อยแล้ว", { description: deleting.name });
    setDeleting(null);
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Agents ทั้งหมด
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {agents.length} เครื่อง
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                ข้อมูลเครื่องและเครือข่ายของ Agents ภายในระบบ
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <label className="relative block min-w-0 lg:w-80">
                <span className="sr-only">ค้นหา Agent</span>
                <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาชื่อ ห้อง MAC IP หรือ OS..."
                  className="h-10 pl-9"
                />
              </label>
            </div>
          </div>
        </div>

        {visibleAgents.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <HugeiconsIcon icon={ComputerIcon} className="size-7 text-slate-400" />
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-white">ไม่พบ Agent</h3>
            <p className="mt-1 text-sm text-slate-500">ลองค้นหาด้วยชื่อหรือข้อมูลเครื่องอื่น</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1260px] text-sm">
                <thead className="bg-slate-50/80 text-left text-xs text-slate-500 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-5 py-3 font-medium">ชื่อ Agent</th>
                    <th className="px-4 py-3 font-medium">ห้อง</th>
                    <th className="px-4 py-3 font-medium">MAC address</th>
                    <th className="px-4 py-3 font-medium">IP address</th>
                    <th className="px-4 py-3 font-medium">OS</th>
                    <th className="px-4 py-3 font-medium">สถานะ</th>
                    <th className="px-4 py-3 font-medium">Last Online</th>
                    <th className="px-5 py-3 text-right font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{agent.name}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{agent.room}</td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{agent.macAddress}</td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{agent.ip}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{agent.os}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {agent.lastOnline}
                      </td>
                      <td className="px-5 py-4">
                        <AgentActions agent={agent} onEdit={setEditing} onDelete={setDeleting} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {visibleAgents.map((agent) => (
                <article key={agent.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <HugeiconsIcon icon={ComputerIcon} className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{agent.room}</p>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <AgentDetail label="MAC address" value={agent.macAddress} />
                    <AgentDetail label="IP address" value={agent.ip} />
                    <div className="col-span-2"><AgentDetail label="OS" value={agent.os} /></div>
                    <div className="col-span-2"><AgentDetail label="Last Online" value={agent.lastOnline} /></div>
                  </dl>
                  <div className="mt-4"><AgentActions agent={agent} onEdit={setEditing} onDelete={setDeleting} mobile /></div>
                </article>
              ))}
            </div>
          </>
        )}

        <footer className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 sm:px-5">
          แสดง {visibleAgents.length} จาก {agents.length} Agents
        </footer>
      </section>

      {editing && (
        <AgentFormDialog key={editing.id} open onOpenChange={(open) => !open && setEditing(null)} title="แก้ไข Agent" initialAgent={editing} onSubmit={handleEdit} />
      )}
      <DeleteAgentDialog agent={deleting} onOpenChange={(open) => !open && setDeleting(null)} onConfirm={handleDelete} />
    </>
  );
}

function AgentActions({ agent, onEdit, onDelete, mobile = false }: { agent: Agent; onEdit: (agent: Agent) => void; onDelete: (agent: Agent) => void; mobile?: boolean }) {
  return (
    <div className={`flex items-center justify-end gap-2 ${mobile ? "grid grid-cols-3" : ""}`}>
      <Button asChild size="sm" variant="outline" className="min-w-0">
        <Link href={`/agents/${agent.id}`}>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          <span className="truncate">รายละเอียด</span>
        </Link>
      </Button>
      <Button size="sm" variant="outline" onClick={() => onEdit(agent)} className="min-w-0">
        <HugeiconsIcon icon={Edit03Icon} className="size-4" /><span className="truncate">แก้ไข</span>
      </Button>
      <Button size="sm" variant="destructive" onClick={() => onDelete(agent)} className="min-w-0">
        <HugeiconsIcon icon={Delete02Icon} className="size-4" /><span className="truncate">ลบ</span>
      </Button>
    </div>
  );
}

function AgentDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-slate-400">{label}</dt><dd className="mt-1 truncate font-mono text-slate-700 dark:text-slate-300">{value}</dd></div>;
}

function StatusBadge({ status }: { status: Agent["status"] }) {
  const online = status === "online";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        online
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          online ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {online ? "ออนไลน์" : "ออฟไลน์"}
    </span>
  );
}

function AgentFormDialog({ open, onOpenChange, title, initialAgent, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; initialAgent?: Agent; onSubmit: (agent: AgentFormData) => void }) {
  const [form, setForm] = useState<AgentFormData>({
    name: initialAgent?.name ?? "",
    room: initialAgent?.room ?? rooms[0],
    macAddress: initialAgent?.macAddress ?? "",
    ip: initialAgent?.ip ?? "",
    os: initialAgent?.os ?? operatingSystems[0],
  });
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); onSubmit(form); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-kanit sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>กรอกข้อมูลประจำเครื่องและข้อมูลเครือข่ายของ Agent</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ชื่อ Agent"><Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="PC-LAB-01" required className="h-10" /></FormField>
            <FormField label="ห้อง">
              <select value={form.room} onChange={(e) => setField("room", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                {rooms.map((room) => <option key={room}>{room}</option>)}
              </select>
            </FormField>
            <FormField label="MAC address"><Input value={form.macAddress} onChange={(e) => setField("macAddress", e.target.value)} placeholder="00:1B:44:11:3A:10" required readOnly={Boolean(initialAgent)} className="h-10 font-mono read-only:cursor-not-allowed read-only:bg-slate-100 dark:read-only:bg-slate-800" /></FormField>
            <FormField label="IP address"><Input value={form.ip} onChange={(e) => setField("ip", e.target.value)} placeholder="192.168.1.101" required readOnly={Boolean(initialAgent)} className="h-10 font-mono read-only:cursor-not-allowed read-only:bg-slate-100 dark:read-only:bg-slate-800" /></FormField>
            <div className="sm:col-span-2"><FormField label="Operating system">
              <select value={form.os} onChange={(e) => setField("os", e.target.value)} disabled={Boolean(initialAgent)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-100 dark:disabled:bg-slate-800">
                {operatingSystems.map((os) => <option key={os}>{os}</option>)}
              </select>
            </FormField></div>
            {initialAgent && (
              <p className="sm:col-span-2 text-xs text-slate-500">
                MAC address, IP address และ OS เป็นข้อมูลที่รายงานจากเครื่อง Agent จึงไม่สามารถแก้ไขได้
              </p>
            )}
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">บันทึกการแก้ไข</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function DeleteAgentDialog({ agent, onOpenChange, onConfirm }: { agent: Agent | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <Dialog open={agent !== null} onOpenChange={onOpenChange}>
      <DialogContent className="font-kanit sm:max-w-md">
        <DialogHeader><DialogTitle>ยืนยันการลบ Agent</DialogTitle><DialogDescription>คุณกำลังจะลบ {agent?.name} ออกจากระบบ การดำเนินการนี้ไม่สามารถย้อนกลับได้</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button variant="destructive" onClick={onConfirm}>ยืนยันลบ Agent</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
