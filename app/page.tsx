import LoginForm from "./_components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden  px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 "
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.08] "
      />

      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-2 shadow-2xl shadow-sky-950/40 backdrop-blur-xl">
        <div className="rounded-[1.25rem] bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/20">
              <span className="text-xl font-bold tracking-tight text-white">R</span>
            </div>
            <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-sky-600 uppercase">
              RAT System
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              เข้าสู่ระบบเพื่อจัดการอุปกรณ์ของคุณ
            </p>
          </div>

          <LoginForm />
        </div>
      </section>

      <p className="absolute bottom-5 text-center text-xs text-slate-500">
        Secure remote administration dashboard
      </p>
    </main>
  );
}
