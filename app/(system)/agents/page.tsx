import AgentManagement from "./_components/AgentManagement";
import { getAgents } from "./_lib/agents-server";
import { getRooms } from "../rooms/_lib/room-server";

type AgentsPageProps = {
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
};

function positiveInteger(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const query = await searchParams;
  const page = positiveInteger(query.page, 1);
  const limit = Math.min(100, positiveInteger(query.limit, 20));
  const [agentsResponse, rooms] = await Promise.all([getAgents(page, limit), getRooms()]);
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
          แก้ไขและดูแล Agents ทุกเครื่องที่เชื่อมต่อกับระบบ
        </p>
      </header>
      <AgentManagement
        key={`${agentsResponse.pagination.page}-${agentsResponse.pagination.limit}`}
        initialAgents={agentsResponse.agents}
        pagination={agentsResponse.pagination}
        rooms={rooms}
      />
    </div>
  );
}
