import { DistributionList } from "@/components/file-distribution/distribution-list";
import { getFileDistributions } from "./_lib/file-distributions-server";

export default async function FileDistributionsPage({ searchParams }: { searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const snapshot = await getFileDistributions({ page, limit, q: params.q?.trim(), status: params.status });
  return <DistributionList initialSnapshot={snapshot} query={params.q ?? ""} filter={params.status ?? "ALL"} />;
}
