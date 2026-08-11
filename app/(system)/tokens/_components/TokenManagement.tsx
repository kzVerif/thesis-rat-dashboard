"use client";

import { FormEvent, useMemo, useState } from "react";
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
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit03Icon,
  Key01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

type RegistrationToken = {
  id: string;
  code: string;
  used: number;
  maxUse: number;
  expiresAt: string;
  createdAt: string;
};

const initialTokens: RegistrationToken[] = [
  { id: "token-1", code: "Ab3!xY7@kL9#", used: 12, maxUse: 30, expiresAt: "2026-12-31", createdAt: "29 ก.ค. 2569" },
  { id: "token-2", code: "Rt8$Qa2%Vm4&", used: 5, maxUse: 5, expiresAt: "2026-10-15", createdAt: "28 ก.ค. 2569" },
  { id: "token-3", code: "Zp6*Mn1!Bc5@", used: 2, maxUse: 20, expiresAt: "2025-12-31", createdAt: "20 ก.ค. 2569" },
];

export default function TokenManagement() {
  const [tokens, setTokens] = useState(initialTokens);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RegistrationToken | null>(null);
  const [deleting, setDeleting] = useState<RegistrationToken | null>(null);

  const visibleTokens = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return tokens;
    return tokens.filter((token) =>
      [token.code, token.expiresAt, getTokenStatus(token).label].some((value) =>
        value.toLocaleLowerCase().includes(normalized)
      )
    );
  }, [query, tokens]);

  const handleCreate = (code: string, maxUse: number, expiresAt: string) => {
    setTokens((current) => [
      {
        id: `token-${Date.now()}`,
        code,
        used: 0,
        maxUse,
        expiresAt,
        createdAt: new Date().toLocaleDateString("th-TH", { dateStyle: "medium" }),
      },
      ...current,
    ]);
    setCreating(false);
    toast.success("สร้าง Token เรียบร้อยแล้ว", { description: code });
  };

  const handleEdit = (maxUse: number, expiresAt: string) => {
    if (!editing) return;
    setTokens((current) =>
      current.map((token) =>
        token.id === editing.id ? { ...token, maxUse, expiresAt } : token
      )
    );
    setEditing(null);
    toast.success("อัปเดตเงื่อนไข Token แล้ว");
  };

  const handleDelete = () => {
    if (!deleting) return;
    setTokens((current) => current.filter((token) => token.id !== deleting.id));
    toast.success("ลบ Token เรียบร้อยแล้ว");
    setDeleting(null);
  };

  const copyToken = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("คัดลอก Token แล้ว");
    } catch {
      toast.error("ไม่สามารถคัดลอก Token ได้");
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Registration Tokens</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{tokens.length} Tokens</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Token มีความยาว 12 ตัวอักษรและใช้สำหรับลงทะเบียน Agents</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <label className="relative min-w-0 flex-1 lg:w-72">
                <span className="sr-only">ค้นหา Token</span>
                <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา Token หรือสถานะ..." className="h-10 pl-9" />
              </label>
              <Button onClick={() => setCreating(true)} size="lg" className="h-10 bg-blue-600 text-white hover:bg-blue-700">
                <HugeiconsIcon icon={Add01Icon} className="mr-1 size-4" />สร้าง Token
              </Button>
            </div>
          </div>
        </div>

        {visibleTokens.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"><HugeiconsIcon icon={Key01Icon} className="size-7 text-slate-400" /></span>
            <h3 className="font-semibold text-slate-900 dark:text-white">ไม่พบ Token</h3>
            <p className="mt-1 text-sm text-slate-500">ลองค้นหาด้วยข้อมูลอื่นหรือสร้าง Token ใหม่</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {visibleTokens.map((token) => {
              const status = getTokenStatus(token);
              const usagePercent = Math.min((token.used / token.maxUse) * 100, 100);
              return (
                <article key={token.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><HugeiconsIcon icon={Key01Icon} className="size-5" /></span>
                    <StatusBadge status={status.type} label={status.label} />
                  </div>
                  <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">{token.code}</code>
                    <Button size="icon-sm" variant="ghost" onClick={() => copyToken(token.code)} aria-label="คัดลอก Token"><HugeiconsIcon icon={Copy01Icon} /></Button>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500"><span>การใช้งาน</span><span>{token.used} / {token.maxUse} เครื่อง</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${usagePercent}%` }} /></div>
                  </div>
                  <dl className="mt-4 space-y-3 text-xs">
                    <InfoRow label="วันหมดอายุ" value={formatDate(token.expiresAt)} />
                    <InfoRow label="วันที่สร้าง" value={token.createdAt} />
                  </dl>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(token)}><HugeiconsIcon icon={Edit03Icon} />เงื่อนไข</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleting(token)}><HugeiconsIcon icon={Delete02Icon} />ลบ</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CreateTokenDialog open={creating} onOpenChange={setCreating} onCreate={handleCreate} existingCodes={tokens.map((token) => token.code)} />
      {editing && <EditTokenDialog key={editing.id} token={editing} onOpenChange={(open) => !open && setEditing(null)} onSave={handleEdit} />}
      <DeleteTokenDialog token={deleting} onOpenChange={(open) => !open && setDeleting(null)} onConfirm={handleDelete} />
    </>
  );
}

function CreateTokenDialog({ open, onOpenChange, onCreate, existingCodes }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (code: string, maxUse: number, expiresAt: string) => void; existingCodes: string[] }) {
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [code, setCode] = useState("");
  const [maxUse, setMaxUse] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const error = mode === "custom" && code ? validateToken(code, existingCodes) : "";
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const finalCode = mode === "auto" ? generateToken(existingCodes) : code;
    const validationError = validateToken(finalCode, existingCodes);
    if (validationError) { toast.error(validationError); return; }
    onCreate(finalCode, maxUse, expiresAt);
    setCode(""); setMaxUse(1); setExpiresAt(""); setMode("auto");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-kanit sm:max-w-lg">
        <DialogHeader><DialogTitle>สร้าง Registration Token</DialogTitle><DialogDescription>เลือกให้ระบบสร้าง Token หรือกำหนดรหัส 12 ตัวอักษรด้วยตนเอง</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <ModeButton active={mode === "auto"} onClick={() => setMode("auto")} label="ระบบกำหนด" />
              <ModeButton active={mode === "custom"} onClick={() => setMode("custom")} label="กำหนดเอง" />
            </div>
            {mode === "custom" && <div className="space-y-2"><Label>รหัส Token</Label><Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} placeholder="Ab3!xY7@kL9#" className="h-10 font-mono" required /><p className={`text-xs ${error ? "text-red-500" : "text-slate-500"}`}>{error || "ต้องมีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ"}</p></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>จำนวนเครื่องสูงสุด (Max Use)</Label><Input type="number" min={1} value={maxUse} onChange={(e) => setMaxUse(Number(e.target.value))} className="h-10" required /></div>
              <div className="space-y-2"><Label>วันหมดอายุ</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10" required /></div>
            </div>
          </div>
          <DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button type="submit" disabled={Boolean(error) || !expiresAt} className="bg-blue-600 text-white hover:bg-blue-700">สร้าง Token</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTokenDialog({ token, onOpenChange, onSave }: { token: RegistrationToken; onOpenChange: (open: boolean) => void; onSave: (maxUse: number, expiresAt: string) => void }) {
  const [maxUse, setMaxUse] = useState(token.maxUse);
  const [expiresAt, setExpiresAt] = useState(token.expiresAt);
  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="font-kanit sm:max-w-md"><DialogHeader><DialogTitle>แก้ไขเงื่อนไข Token</DialogTitle><DialogDescription>รหัส Token ไม่สามารถแก้ไขได้หลังจากสร้าง</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>รหัส Token</Label><Input value={token.code} readOnly className="h-10 bg-slate-100 font-mono dark:bg-slate-800" /></div><div className="space-y-2"><Label>Max Use</Label><Input type="number" min={Math.max(1, token.used)} value={maxUse} onChange={(e) => setMaxUse(Number(e.target.value))} className="h-10" /></div><div className="space-y-2"><Label>วันหมดอายุ</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button onClick={() => onSave(maxUse, expiresAt)} className="bg-blue-600 text-white hover:bg-blue-700">บันทึกเงื่อนไข</Button></DialogFooter></DialogContent></Dialog>;
}

function DeleteTokenDialog({ token, onOpenChange, onConfirm }: { token: RegistrationToken | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog open={token !== null} onOpenChange={onOpenChange}><DialogContent className="font-kanit sm:max-w-md"><DialogHeader><DialogTitle>ยืนยันการลบ Token</DialogTitle><DialogDescription>Token {token?.code} จะไม่สามารถใช้ลงทะเบียน Agent ได้อีก</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button variant="destructive" onClick={onConfirm}>ยืนยันลบ Token</Button></DialogFooter></DialogContent></Dialog>;
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-sm font-medium ${active ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" : "border-slate-200 dark:border-slate-800"}`}>{label}</button>;
}

function StatusBadge({ status, label }: { status: "active" | "expired" | "exhausted"; label: string }) {
  const classes = status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : status === "expired" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-700 dark:text-slate-300">{value}</dd></div>;
}

function getTokenStatus(token: RegistrationToken) {
  if (new Date(`${token.expiresAt}T23:59:59`) < new Date()) return { type: "expired" as const, label: "หมดอายุ" };
  if (token.used >= token.maxUse) return { type: "exhausted" as const, label: "ใช้ครบแล้ว" };
  return { type: "active" as const, label: "ใช้งานได้" };
}

function validateToken(code: string, existingCodes: string[]) {
  if (code.length !== 12) return "Token ต้องมีความยาว 12 ตัวอักษร";
  if (!/[a-z]/.test(code)) return "Token ต้องมีตัวพิมพ์เล็ก";
  if (!/[A-Z]/.test(code)) return "Token ต้องมีตัวพิมพ์ใหญ่";
  if (!/[0-9]/.test(code)) return "Token ต้องมีตัวเลข";
  if (!/[^a-zA-Z0-9]/.test(code)) return "Token ต้องมีอักขระพิเศษ";
  if (existingCodes.includes(code)) return "Token นี้มีอยู่ในระบบแล้ว";
  return "";
}

function generateToken(existingCodes: string[]): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const all = lower + upper + numbers + special;
  let token = [
    lower[randomIndex(lower.length)],
    upper[randomIndex(upper.length)],
    numbers[randomIndex(numbers.length)],
    special[randomIndex(special.length)],
    ...Array.from({ length: 8 }, () => all[randomIndex(all.length)]),
  ].sort(() => Math.random() - 0.5).join("");
  if (existingCodes.includes(token)) token = generateToken(existingCodes);
  return token;
}

function randomIndex(length: number) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % length;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", { dateStyle: "medium" });
}
