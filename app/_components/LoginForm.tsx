"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const minimumLoadingTime = 1000;

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const [response] = await Promise.all([
        fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: formData.get("username"),
            password: formData.get("password"),
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, minimumLoadingTime)),
      ]);
      const data = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!response.ok) {
        const message = [data?.message, data?.error, data?.detail].find(
          (value): value is string => typeof value === "string" && value.length > 0,
        );
        toast.error(message ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm text-slate-700">
          ชื่อผู้ใช้งาน
        </Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="กรอกชื่อผู้ใช้งาน"
          required
          autoFocus
          className="h-11 border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password" className="text-sm text-slate-700">
            รหัสผ่าน
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่าน"
            required
            minLength={8}
            className="h-11 border-slate-200 bg-slate-50 px-3 pr-16 text-sm text-slate-950 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-3 my-auto h-fit text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={showPassword}
          >
            {showPassword ? "ซ่อน" : "แสดง"}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>

      <div className="flex items-center justify-center gap-2">
        <Link
          href="/register"
          className="text-xs font-medium text-sky-700 transition-colors hover:text-sky-900 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          ส่งคำขอสมัครบัญชีใหม่
        </Link>
      </div>
    </form>
  );
}
