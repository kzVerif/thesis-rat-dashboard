"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { AuthSession, AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiError = { message?: string; error?: string; detail?: string };

async function getErrorMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as ApiError | null;
  return data?.message || data?.detail || data?.error || fallback;
}

export default function SettingsClient({
  initialUser,
  initialSessions,
}: {
  initialUser: AuthUser;
  initialSessions: AuthSession[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  async function revokeSession(session: AuthSession) {
    setPendingSession(session.id);
    try {
      const response = await fetch(`/api/auth/sessions/${encodeURIComponent(session.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        toast.error(await getErrorMessage(response, "ลบ session ไม่สำเร็จ"));
        return;
      }
      toast.success("นำอุปกรณ์ออกจากระบบแล้ว");
      if (session.current) {
        router.replace("/");
        router.refresh();
      } else {
        setSessions((current) => current.filter((item) => item.id !== session.id));
      }
    } finally {
      setPendingSession(null);
    }
  }

  async function logoutAll() {
    setLoggingOutAll(true);
    try {
      const response = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        toast.error(await getErrorMessage(response, "ออกจากระบบทุกอุปกรณ์ไม่สำเร็จ"));
        return;
      }
      toast.success("ออกจากระบบทุกอุปกรณ์แล้ว");
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOutAll(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChangingPassword(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("new_password") ?? "");
    const confirmPassword = String(data.get("confirm_password") ?? "");

    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      setChangingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          current_password: data.get("current_password"),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      if (!response.ok) {
        toast.error(await getErrorMessage(response, "เปลี่ยนรหัสผ่านไม่สำเร็จ"));
        return;
      }
      form.reset();
      toast.success("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่");
      router.replace("/");
      router.refresh();
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-white dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลบัญชี</CardTitle>
          <CardDescription>ข้อมูลจากบัญชีที่กำลังเข้าสู่ระบบ</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="ชื่อผู้ใช้" value={initialUser.username} />
          <Info label="ชื่อที่แสดง" value={initialUser.display_name || "-"} />
          <Info label="อีเมล" value={initialUser.email || "-"} />
          <Info label="สิทธิ์" value={initialUser.role} />
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base">เปลี่ยนรหัสผ่าน</CardTitle>
          <CardDescription>เมื่อเปลี่ยนสำเร็จ ทุกอุปกรณ์จะต้องเข้าสู่ระบบใหม่</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={changePassword}>
            <PasswordField name="current_password" label="รหัสผ่านปัจจุบัน" autoComplete="current-password" />
            <PasswordField name="new_password" label="รหัสผ่านใหม่" autoComplete="new-password" />
            <PasswordField name="confirm_password" label="ยืนยันรหัสผ่านใหม่" autoComplete="new-password" />
            <Button disabled={changingPassword} type="submit">
              {changingPassword ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-950 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">อุปกรณ์ที่เข้าสู่ระบบ</CardTitle>
          <CardDescription>ตรวจสอบและนำ session ที่ไม่รู้จักออกจากระบบ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length ? (
            <div className="divide-y rounded-xl border">
              {sessions.map((session) => (
                <div key={session.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{friendlyUserAgent(session.user_agent)}</p>
                      {session.current ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">เครื่องนี้</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      IP {session.ip_address || "ไม่ทราบ"} · ใช้งานล่าสุด {formatDate(session.last_activity_at)} · หมดอายุ {formatDate(session.expires_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendingSession === session.id}
                    onClick={() => revokeSession(session)}
                  >
                    {pendingSession === session.id ? "กำลังนำออก..." : "นำออกจากระบบ"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">ไม่พบข้อมูล session</p>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="destructive" disabled={loggingOutAll} onClick={logoutAll}>
              {loggingOutAll ? "กำลังออกจากระบบ..." : "ออกจากระบบทุกอุปกรณ์"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}

function PasswordField({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="password" minLength={8} required autoComplete={autoComplete} /></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ไม่ทราบ" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function friendlyUserAgent(value: string) {
  if (!value) return "อุปกรณ์ที่ไม่ทราบชนิด";
  const browser = value.includes("Edg/") ? "Microsoft Edge" : value.includes("Chrome/") ? "Google Chrome" : value.includes("Firefox/") ? "Firefox" : value.includes("Safari/") ? "Safari" : "Browser";
  const os = value.includes("Windows") ? "Windows" : value.includes("Mac OS") ? "macOS" : value.includes("Android") ? "Android" : value.includes("iPhone") || value.includes("iPad") ? "iOS" : "อุปกรณ์ไม่ทราบชนิด";
  return `${browser} บน ${os}`;
}
