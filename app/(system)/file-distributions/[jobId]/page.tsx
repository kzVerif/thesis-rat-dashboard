import { DistributionDetail } from "@/components/file-distribution/distribution-detail";
import { notFound } from "next/navigation";
import { DistributionNotFoundError, getFileDistribution } from "../_lib/file-distributions-server";

export default async function FileDistributionDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  let job;
  try {
    job = await getFileDistribution(jobId);
  } catch (error) {
    if (error instanceof DistributionNotFoundError) notFound();
    throw error;
  }
  return <DistributionDetail initialJob={job} />;
}
