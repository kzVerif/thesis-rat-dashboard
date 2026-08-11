import AgentDetailDashboard from "./_components/AgentDetailDashboard";
import { getAgentDetail } from "./_lib/agent-server";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentDetail(id);

  return <AgentDetailDashboard initialAgent={agent} />;
}

