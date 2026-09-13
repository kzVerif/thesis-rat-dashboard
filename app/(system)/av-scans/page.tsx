import { ScanForm } from "@/components/av-scan/scan-form";
import { getScanSnapshot } from "./_lib/scan-server";

export default async function Page() {
  const snapshot = await getScanSnapshot();
  return <ScanForm snapshot={snapshot} />;
}
