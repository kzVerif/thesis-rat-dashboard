import { ScanResults } from "@/components/av-scan/scan-results";
import { getScanSnapshot } from "../_lib/scan-server";
import { loadAvScanResults } from "@/actions/av-scan-results";

export default async function Page() {
  const [snapshot, initialResults] = await Promise.all([getScanSnapshot(), loadAvScanResults()]);
  return <ScanResults snapshot={snapshot} initialResults={initialResults} />;
}
