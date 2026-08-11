import type { AuditLogsSnapshot } from "../_lib/types";

export default function AuditLogsView({
  snapshot,
}: {
  snapshot: AuditLogsSnapshot;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Audit Logs
        </p>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          ประวัติการใช้งานระบบ
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          รอรับรายการ Audit Log จากระบบหลังบ้าน • {snapshot.source}
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        ยังไม่มีรายการ Audit Log
      </section>
    </div>
  );
}
