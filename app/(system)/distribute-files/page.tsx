import DistributeFilesClient from "./_components/DistributeFilesClient";
import { getDistributionSnapshot } from "./_lib/distribute-files-server";

export default async function DistributeFilesPage() {
  await getDistributionSnapshot();
  return <DistributeFilesClient />;
}

