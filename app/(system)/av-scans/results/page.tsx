import { ScanResults } from "@/components/av-scan/scan-results";
import { getScanSnapshot } from "../_lib/scan-server";

export default async function Page() {
  const snapshot = await getScanSnapshot();
  return <ScanResults snapshot={snapshot} />;
}
