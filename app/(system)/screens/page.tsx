import ScreensClient from "./_components/ScreensClient";
import { getScreensSnapshot } from "./_lib/screens-server";

export default async function ScreensPage() {
  const snapshot = await getScreensSnapshot();
  return <ScreensClient initialSnapshot={snapshot} />;
}
