import AgentManagement from "./_components/AgentManagement";
import { getAgentsPageSnapshot } from "./_lib/agents-server";

export default async function AgentsPage() {
  await getAgentsPageSnapshot();
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Agent Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          จัดการ Agents
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          เพิ่ม แก้ไข และดูแล Agents ทุกเครื่องที่เชื่อมต่อกับระบบ
        </p>
      </header>
      <AgentManagement />
    </div>
  );
}
