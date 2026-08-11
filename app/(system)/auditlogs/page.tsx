import AuditLogsView from "./_components/AuditLogsView";
import { getAuditLogsSnapshot } from "./_lib/auditlogs-server";

export default async function AuditLogsPage() {
  const snapshot = await getAuditLogsSnapshot();
  return <AuditLogsView snapshot={snapshot} />;
}

