"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deriveJobStatus,
  fileDistributionCreatedSchema,
  fileDistributionErrorSchema,
  fileDistributionTargetUpdateSchema,
  type DistributionConnectionState,
  type DistributionRequest,
  type FileDistributionJob,
} from "@/lib/file-distribution";
import { revalidateFileDistributionAction } from "@/actions/file-distributions";

type PendingRequest = DistributionRequest & { requestId: string; payload: string };
type DistributionContextValue = {
  connection: DistributionConnectionState;
  jobs: Record<string, FileDistributionJob>;
  distribute: (request: DistributionRequest) => string;
  hydrateJobs: (jobs: FileDistributionJob[]) => void;
  retain: () => () => void;
};

const DistributionContext = createContext<DistributionContextValue | null>(null);
const socketUrl = process.env.NEXT_PUBLIC_FRONTEND_WS_URL;

export function FileDistributionProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<DistributionConnectionState>("disconnected");
  const [consumerCount, setConsumerCount] = useState(0);
  const [jobs, setJobs] = useState<Record<string, FileDistributionJob>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<PendingRequest[]>([]);
  const earlyUpdatesRef = useRef(new Map<string, unknown[]>());
  const active = consumerCount > 0;

  const retain = useCallback(() => {
    setConsumerCount((count) => count + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setConsumerCount((count) => Math.max(0, count - 1));
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!socketUrl) return;
    let socket: WebSocket | null = null;
    let timer: number | null = null;
    let retries = 0;
    let disposed = false;

    const applyUpdate = (raw: unknown) => {
      const parsed = fileDistributionTargetUpdateSchema.safeParse(raw);
      if (!parsed.success) return false;
      const update = parsed.data;
      let applied = false;
      setJobs((current) => {
        const job = current[update.job_id];
        if (!job) return current;
        applied = true;
        const previous = job.agents[update.agent_id];
        const agents = {
          ...job.agents,
          [update.agent_id]: {
            agentId: update.agent_id,
            hostname: update.hostname ?? previous?.hostname ?? update.agent_id,
            ipAddress: previous?.ipAddress ?? null,
            status: update.status,
            progress: update.progress,
            downloadedBytes: update.downloaded_bytes,
            totalBytes: update.total_bytes || previous?.totalBytes || job.fileSize,
            updatedAt: new Date().toISOString(),
            errorCode: update.error_code ?? previous?.errorCode ?? null,
            errorMessage: update.error_message ?? previous?.errorMessage ?? null,
          },
        };
        const values = Object.values(agents);
        return { ...current, [job.id]: { ...job, agents, status: deriveJobStatus(values), completedTargets: values.filter((agent) => agent.status === "COMPLETED").length, downloadingTargets: values.filter((agent) => ["PENDING", "SENT", "DOWNLOADING", "VERIFYING"].includes(agent.status)).length, failedTargets: values.filter((agent) => agent.status === "FAILED").length, offlineTargets: values.filter((agent) => agent.status === "OFFLINE").length, updatedAt: update.updated_at ?? new Date().toISOString() } };
      });
      if (!applied) {
        const queued = earlyUpdatesRef.current.get(update.job_id) ?? [];
        earlyUpdatesRef.current.set(update.job_id, [...queued, raw].slice(-1000));
      }
      return true;
    };

    const connect = () => {
      if (disposed) return;
      setConnection(retries === 0 ? "connecting" : "reconnecting");
      socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        retries = 0;
        setConnection("live");
        pendingRef.current.forEach((request) => socket?.send(request.payload));
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let raw: unknown;
        try { raw = JSON.parse(event.data); } catch { return; }
        if (applyUpdate(raw)) return;
        const created = fileDistributionCreatedSchema.safeParse(raw);
        if (created.success) {
          void revalidateFileDistributionAction(created.data.job_id).catch(() => undefined);
          const index = pendingRef.current.findIndex((request) => request.fileId === created.data.file_id);
          const pending = index >= 0 ? pendingRef.current.splice(index, 1)[0] : undefined;
          if (!pending) return;
          const agents = Object.fromEntries(pending.computers.map((computer) => [computer.id, {
            agentId: computer.id,
            hostname: computer.hostname,
            ipAddress: computer.ipAddress,
            status: computer.status === "ONLINE" ? "SENT" as const : "OFFLINE" as const,
            progress: 0,
            downloadedBytes: 0,
            totalBytes: pending.fileSize,
            updatedAt: new Date().toISOString(),
            errorCode: null,
            errorMessage: null,
          }]));
          const job: FileDistributionJob = {
            id: created.data.job_id,
            requestId: pending.requestId,
            fileId: pending.fileId,
            filename: pending.filename,
            fileSize: pending.fileSize,
            targetLabel: pending.targetLabel,
            status: created.data.status,
            totalTargets: created.data.total_targets,
            onlineTargets: created.data.online_targets,
            offlineTargets: created.data.offline_targets,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            completedTargets: 0,
            downloadingTargets: created.data.online_targets,
            failedTargets: 0,
            requestedBy: null,
            agents,
          };
          setJobs((current) => ({ ...current, [job.id]: job }));
          const early = earlyUpdatesRef.current.get(job.id) ?? [];
          earlyUpdatesRef.current.delete(job.id);
          queueMicrotask(() => early.forEach(applyUpdate));
          toast.success("เริ่มกระจายไฟล์แล้ว", { description: `${pending.filename} → ${pending.targetLabel}` });
          return;
        }
        const error = fileDistributionErrorSchema.safeParse(raw);
        if (error.success) {
          pendingRef.current.shift();
          toast.error("กระจายไฟล์ไม่สำเร็จ", { description: error.data.error });
        }
        else if (process.env.NODE_ENV === "development") console.debug("Ignored invalid distribution event", raw);
      });
      socket.addEventListener("close", () => {
        if (disposed) return;
        socketRef.current = null;
        retries += 1;
        setConnection("reconnecting");
        timer = window.setTimeout(connect, Math.min(1000 * 2 ** (retries - 1), 15000));
      });
      socket.addEventListener("error", () => setConnection("disconnected"));
    };
    connect();
    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
      setConnection("disconnected");
    };
  }, [active]);

  const distribute = useCallback((request: DistributionRequest) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket ยังไม่ได้เชื่อมต่อ");
    }
    const requestId = crypto.randomUUID();
    const payload = JSON.stringify({ type: "FILE_DISTRIBUTE", request_id: requestId, file_id: request.fileId, target: request.target });
    pendingRef.current.push({ ...request, requestId, payload });
    socketRef.current.send(payload);
    return requestId;
  }, []);

  const hydrateJobs = useCallback((snapshots: FileDistributionJob[]) => {
    setJobs((current) => ({ ...current, ...Object.fromEntries(snapshots.map((job) => [job.id, job])) }));
  }, []);

  const value = useMemo(() => ({ connection, jobs, distribute, hydrateJobs, retain }), [connection, distribute, hydrateJobs, jobs, retain]);
  return <DistributionContext value={value}>{children}</DistributionContext>;
}

export function useFileDistribution() {
  const context = useContext(DistributionContext);
  if (!context) throw new Error("useFileDistribution must be used inside FileDistributionProvider");
  const { retain } = context;
  useEffect(() => retain(), [retain]);
  return context;
}
