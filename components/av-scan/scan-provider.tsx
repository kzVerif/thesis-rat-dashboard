"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { VirusScanClient } from "@/lib/virus-scan-client";
import { usePathname } from "next/navigation";
export { statusLabels, type ScanMode, type ScanStatus } from "@/lib/virus-scan";

const ScanContext = createContext<VirusScanClient | null>(null);
export function ScanProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [client] = useState(() => new VirusScanClient(process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "", url =>
    new WebSocket(url || `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/frontend`)));
  useEffect(() => {
    if (pathname === "/av-scans/results") return;
    return client.start();
  }, [client, pathname]);
  return <ScanContext.Provider value={client}>{children}</ScanContext.Provider>;
}
export function useScans() {
  const client = useContext(ScanContext);
  if (!client) throw new Error("ScanProvider is required");
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return { ...state, submit: client.submit, refresh: client.refresh, acknowledgeUncertain: client.acknowledgeUncertain };
}
