// components/TokenManagement.tsx  (replace your existing component)
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import * as tokensClient from "../_lib/tokensClient";

type RegistrationToken = {
  id: string;
  code: string;
  used: number;
  maxUse: number;
  expiresAt: string;
  createdAt: string;
};

export default function TokenManagement() {
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RegistrationToken | null>(null);
  const [deleting, setDeleting] = useState<RegistrationToken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const json = await tokensClient.listTokens(); // expects { tokens: [...] }
        if (!mounted) return;
        const rows = json.tokens || [];
        const mapped: RegistrationToken[] = rows.map((t: any) => ({
          id: t.id,
          code: t.token,
          used: t.used_count ?? 0,
          maxUse: t.max_use ?? 1,
          expiresAt: t.expires_at ? t.expires_at.slice(0, 10) : "",
          createdAt: new Date(t.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" }),
        }));
        setTokens(mapped);
      } catch (e: any) {
        console.error(e);
        toast.error("ไม่สามารถโหลดรายการ Token ได้");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const visibleTokens = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return tokens;
    return tokens.filter((token) =>
      [token.code, token.expiresAt, getTokenStatus(token).label].some((value) =>
        value.toLocaleLowerCase().includes(normalized)
      )
    );
  }, [query, tokens]);

  const handleCreate = async (_code: string, maxUse: number, expiresAt: string) => {
    // NOTE: backend generates token value, client-provided code is ignored.
    try {
      const body = { token_type: "registration", max_use: maxUse, expires_at: expiresAt };
      const res = await tokensClient.createToken(body); // { id, token }
      const newToken: RegistrationToken = {
        id: res.id,
        code: res.token,
        used: 0,
        maxUse,
        expiresAt,
        createdAt: new Date().toLocaleDateString("th-TH", { dateStyle: "medium" }),
      };
      setTokens((current) => [newToken, ...current]);
      setCreating(false);
      toast.success("สร้าง Token เรียบร้อยแล้ว", { description: res.token });
    } catch (e: any) {
      toast.error(e.message || "สร้าง Token ไม่สำเร็จ");
    }
  };

  const handleEdit = async (maxUse: number, expiresAt: string) => {
    if (!editing) return;
    try {
      await tokensClient.updateToken(editing.id, { max_use: maxUse, expires_at: expiresAt });
      setTokens((current) =>
        current.map((token) => (token.id === editing.id ? { ...token, maxUse, expiresAt } : token))
      );
      setEditing(null);
      toast.success("อัปเดตเงื่อนไข Token แล้ว");
    } catch (e: any) {
      toast.error(e.message || "อัปเดตไม่สำเร็จ");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await tokensClient.revokeToken(deleting.id);
      setTokens((current) => current.filter((token) => token.id !== deleting.id));
      toast.success("ลบ Token เรียบร้อยแล้ว");
      setDeleting(null);
    } catch (e: any) {
      toast.error(e.message || "ลบไม่สำเร็จ");
    }
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

        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : visibleTokens.length === 0 ? (
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

function validateToken(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 6 && trimmed.length <= 64;
}

function generateToken(prefix = "RAT") {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

function formatDate(value: string) {
  if (!value) return "ไม่ระบุ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
}

function getTokenStatus(token: RegistrationToken) {
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
  const now = new Date();

  if (expiresAt && expiresAt < now) {
    return { type: "expired", label: "หมดอายุ" } as const;
  }

  if (token.used >= token.maxUse) {
    return { type: "used", label: "เต็มแล้ว" } as const;
  }

  if (token.maxUse - token.used <= 1) {
    return { type: "warning", label: "ใกล้เต็ม" } as const;
  }

  return { type: "active", label: "พร้อมใช้งาน" } as const;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function StatusBadge({ status, label }: { status: "active" | "warning" | "expired" | "used"; label: string }) {
  const styles: Record<typeof status, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    expired: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    used: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}>
      {label}
    </span>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function CreateTokenDialog({
  open,
  onOpenChange,
  onCreate,
  existingCodes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (_code: string, maxUse: number, expiresAt: string) => Promise<void>;
  existingCodes: string[];
}) {
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [customCode, setCustomCode] = useState("");
  const [maxUse, setMaxUse] = useState(5);
  const [expiresAt, setExpiresAt] = useState("");

  const reset = () => {
    setMode("auto");
    setCustomCode("");
    setMaxUse(5);
    setExpiresAt("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const code = mode === "custom" ? customCode : generateToken("RAT");
    if (mode === "custom" && !validateToken(code)) {
      toast.error("โค้ด Token ต้องมีความยาว 6-64 ตัวอักษร");
      return;
    }
    if (existingCodes.includes(code)) {
      toast.error("Token นี้มีอยู่แล้ว กรุณาเลือกโค้ดอื่น");
      return;
    }

    await onCreate(code, maxUse, expiresAt);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) reset();
      onOpenChange(next);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>สร้าง Token ใหม่</DialogTitle>
          <DialogDescription>
            ระบบจะสร้าง Token จริงให้คุณทันที โดยค่าโค้ดที่เลือกในโหมด custom จะถูกตรวจสอบก่อนบันทึก
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>โหมดการสร้าง</Label>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton active={mode === "auto"} onClick={() => setMode("auto")}>สร้างอัตโนมัติ</ModeButton>
              <ModeButton active={mode === "custom"} onClick={() => setMode("custom")}>กำหนดเอง</ModeButton>
            </div>
          </div>

          {mode === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="token-code">Token</Label>
              <Input
                id="token-code"
                value={customCode}
                onChange={(event) => setCustomCode(event.target.value)}
                placeholder="เช่น RAT-ABC123"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-use">จำนวนการใช้งาน</Label>
              <Input
                id="max-use"
                type="number"
                min={1}
                value={maxUse}
                onChange={(event) => setMaxUse(Number(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">วันหมดอายุ</Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">สร้าง Token</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTokenDialog({
  token,
  onOpenChange,
  onSave,
}: {
  token: RegistrationToken;
  onOpenChange: (open: boolean) => void;
  onSave: (maxUse: number, expiresAt: string) => Promise<void>;
}) {
  const [maxUse, setMaxUse] = useState(token.maxUse);
  const [expiresAt, setExpiresAt] = useState(token.expiresAt);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave(maxUse, expiresAt);
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>แก้ไขเงื่อนไข Token</DialogTitle>
          <DialogDescription>ปรับจำนวนการใช้งานและวันหมดอายุสำหรับ token นี้</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-max-use">จำนวนการใช้งาน</Label>
              <Input
                id="edit-max-use"
                type="number"
                min={1}
                value={maxUse}
                onChange={(event) => setMaxUse(Number(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expires-at">วันหมดอายุ</Label>
              <Input
                id="edit-expires-at"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTokenDialog({
  token,
  onOpenChange,
  onConfirm,
}: {
  token: RegistrationToken | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  if (!token) return null;

  return (
    <Dialog open={!!token} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ลบ Token</DialogTitle>
          <DialogDescription>
            คุณต้องการลบ Token <span className="font-mono text-slate-900 dark:text-slate-100">{token.code}</span> หรือไม่?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()}>ลบ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}