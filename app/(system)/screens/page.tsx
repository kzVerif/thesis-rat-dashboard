import ScreensClient from "./_components/ScreensClient";
import { getScreensSnapshot } from "./_lib/screens-server";

export default async function ScreensPage() {
  await getScreensSnapshot();
  return <ScreensClient />;
}
