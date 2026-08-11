import Link from "next/link";

import RegisterForm from "./_components/RegisterForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.08] "
      />

      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-2 shadow-2xl shadow-sky-950/20 backdrop-blur-xl">
        <div className="rounded-[1.25rem] bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/20">
              <span className="text-xl font-bold tracking-tight text-white">R</span>
            </div>
            <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-sky-600 uppercase">
              RAT System
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              สมัครบัญชีใหม่
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              กรอกข้อมูลเพื่อส่งคำขอเข้าใช้งานระบบ
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-slate-500">
            มีบัญชีอยู่แล้ว?{" "}
            <Link
              href="/"
              className="font-semibold text-sky-700 transition-colors hover:text-sky-900 hover:underline"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
