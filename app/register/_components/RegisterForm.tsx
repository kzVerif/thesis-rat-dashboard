"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { registerUser, type RegisterState } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClassName =
  "h-11 border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20";

const initialState: RegisterState = {
  success: false,
  message: "",
};

const minimumLoadingTime = 1000;

async function registerWithMinimumDelay(
  previousState: RegisterState,
  formData: FormData,
) {
  const [result] = await Promise.all([
    registerUser(previousState, formData),
    new Promise((resolve) => setTimeout(resolve, minimumLoadingTime)),
  ]);

  return result;
}

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerWithMinimumDelay,
    initialState,
  );

  useEffect(() => {
    if (isPending) {
      toast.loading("กำลังส่งคำขอสมัครบัญชี...", { id: "register-request" });
      return;
    }

    if (!state.message) return;

    if (state.success) {
      toast.success(state.message, { id: "register-request" });
    } else {
      toast.error(state.message, { id: "register-request" });
    }
  }, [isPending, state]);

  return (
    <form className="space-y-4" action={formAction}>
      <FormField
        id="username"
        label="ชื่อผู้ใช้"
        error={state.errors?.username?.[0]}
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="กรอกชื่อผู้ใช้งาน"
          minLength={3}
          required
          autoFocus
          aria-invalid={Boolean(state.errors?.username)}
          className={inputClassName}
        />
      </FormField>

      <FormField
        id="fullname"
        label="ชื่อ-นามสกุล"
        error={state.errors?.fullname?.[0]}
      >
        <Input
          id="fullname"
          name="fullname"
          autoComplete="name"
          placeholder="กรอกชื่อ-นามสกุล"
          minLength={3}
          required
          aria-invalid={Boolean(state.errors?.fullname)}
          className={inputClassName}
        />
      </FormField>

      <FormField id="email" label="อีเมล" error={state.errors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          aria-invalid={Boolean(state.errors?.email)}
          className={inputClassName}
        />
      </FormField>

      <FormField
        id="register-password"
        label="รหัสผ่าน"
        error={state.errors?.password?.[0]}
      >
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
          minLength={8}
          required
          aria-invalid={Boolean(state.errors?.password)}
          className={inputClassName}
        />
      </FormField>

      <FormField
        id="confirm-password"
        label="ยืนยันรหัสผ่าน"
        error={state.errors?.confirmPassword?.[0]}
      >
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          minLength={8}
          required
          aria-invalid={Boolean(state.errors?.confirmPassword)}
          className={inputClassName}
        />
      </FormField>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
      >
        {isPending ? "กำลังส่งคำขอ..." : "ส่งคำขอสมัครบัญชี"}
      </Button>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-slate-700">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
