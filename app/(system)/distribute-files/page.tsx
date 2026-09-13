import DistributeFilesClient from "./_components/DistributeFilesClient";
import { getDistributionSnapshot } from "./_lib/distribute-files-server";

export default async function DistributeFilesPage() {
  const snapshot = await getDistributionSnapshot();
  return <DistributeFilesClient snapshot={snapshot} />;
}
