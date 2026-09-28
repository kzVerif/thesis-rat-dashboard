"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  applyDistributionUpdate,
  createDistributionPayload,
  type DistributionTargetUpdate,
  fileDistributionCreatedSchema,
  fileDistributionErrorSchema,
  fileDistributionTargetUpdateSchema,
  type DistributionConnectionState,
  type DistributionRequest,
  type FileDistributionJob,
} from "@/lib/file-distribution";
import { revalidateFileDistributionAction } from "@/actions/file-distributions";

type PendingRequest = DistributionRequest & {
  requestId: string;
  payload: string;
};
type DistributionContextValue = {
  connection: DistributionConnectionState;
  pending: boolean;
  jobs: Record<string, FileDistributionJob>;
  distribute: (request: DistributionRequest) => string;
  hydrateJobs: (jobs: FileDistributionJob[]) => void;
  retain: () => () => void;
};

const DistributionContext = createContext<DistributionContextValue | null>(
  null,
);
const socketUrl = process.env.NEXT_PUBLIC_FRONTEND_WS_URL;

export function FileDistributionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [connection, setConnection] =
    useState<DistributionConnectionState>("disconnected");
  const [pending, setPending] = useState(false);
  const [consumerCount, setConsumerCount] = useState(0);
  const [jobs, setJobs] = useState<Record<string, FileDistributionJob>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const sendPendingRef = useRef<() => void>(() => {});
  const pendingRef = useRef<PendingRequest[]>([]);
  const earlyUpdatesRef = useRef(new Map<string, DistributionTargetUpdate>());
  const active = consumerCount > 0 || pending;

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
    let responseTimer: number | null = null;
    let terminal = false;
    const clearResponseTimer = () => {
      if (responseTimer !== null) window.clearTimeout(responseTimer);
      responseTimer = null;
    };
    const armResponseTimer = () => {
      clearResponseTimer();
      if (pendingRef.current.length)
        responseTimer = window.setTimeout(() => socket?.close(), 15000);
    };
    sendPendingRef.current = () => {
      try {
        pendingRef.current.forEach((request) => socket?.send(request.payload));
      } catch {
        socket?.close();
      }
      armResponseTimer();
    };
    let disposed = false;

    const applyUpdate = (raw: unknown) => {
      const parsed = fileDistributionTargetUpdateSchema.safeParse(raw);
      if (!parsed.success) return false;
      const update = {
        ...parsed.data,
        updated_at: parsed.data.updated_at ?? new Date().toISOString(),
      };
      // Store snapshots outside React state updaters so batching/Strict Mode
      // cannot lose events received before CREATED or REST hydration.
      earlyUpdatesRef.current.set(
        `${update.job_id}:${update.agent_id}`,
        update,
      );
      setJobs((current) => {
        const job = current[update.job_id];
        return job
          ? { ...current, [job.id]: applyDistributionUpdate(job, update) }
          : current;
      });
      return true;
    };

    const connect = () => {
      if (disposed) return;
      setConnection(retries === 0 ? "connecting" : "reconnecting");
      try {
        socket = new WebSocket(socketUrl);
      } catch {
        setConnection("disconnected");
        return;
      }
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        if (disposed) return;
        retries = 0;
        setConnection("live");
        sendPendingRef.current();
      });
      socket.addEventListener("message", (event) => {
        if (disposed) return;
        if (typeof event.data !== "string") return;
        let raw: unknown;
        try {
          raw = JSON.parse(event.data);
        } catch {
          return;
        }
        if (applyUpdate(raw)) return;
        const created = fileDistributionCreatedSchema.safeParse(raw);
        if (created.success) {
          void revalidateFileDistributionAction(created.data.job_id).catch(
            () => undefined,
          );
          const index = pendingRef.current.findIndex(
            (request) => request.fileId === created.data.file_id,
          );
          const pending =
            index >= 0 ? pendingRef.current.splice(index, 1)[0] : undefined;
          if (!pending) return;
          clearResponseTimer();
          setPending(false);
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
            agents: {},
          };
          let snapshot = job;
          for (const update of earlyUpdatesRef.current.values()) {
            if (update.job_id === job.id)
              snapshot = applyDistributionUpdate(snapshot, update);
          }
          setJobs((current) => ({ ...current, [job.id]: snapshot }));
          if (job.status === "FAILED")
            toast.error("งานกระจายไฟล์ไม่สำเร็จ", {
              description:
                job.totalTargets === 0
                  ? "ไม่มีเครื่องในห้องปลายทาง"
                  : "ไม่มีเครื่องที่รับไฟล์สำเร็จ",
            });
          else
            toast.success("สร้างงานกระจายไฟล์แล้ว", {
              description: `${pending.filename} → ${pending.targetLabel}`,
            });
          return;
        }
        const error = fileDistributionErrorSchema.safeParse(raw);
        if (error.success) {
          clearResponseTimer();
          pendingRef.current.shift();
          setPending(false);
          console.debug("File distribution rejected", error.data.error);
          terminal = ["ขาดการ login", "ไม่มี permission"].includes(
            error.data.error,
          );
          toast.error("กระจายไฟล์ไม่สำเร็จ", {
            description: terminal
              ? "กรุณาเข้าสู่ระบบใหม่หรือตรวจสอบสิทธิ์กระจายไฟล์"
              : "กรุณาตรวจสอบไฟล์และปลายทาง แล้วลองใหม่",
          });
          if (terminal) {
            setConnection("disconnected");
            socket?.close();
          }
        }
      });
      socket.addEventListener("close", () => {
        clearResponseTimer();
        if (disposed) return;
        socketRef.current = null;
        if (terminal) return;
        retries += 1;
        setConnection("reconnecting");
        timer = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** (retries - 1), 15000),
        );
      });
      socket.addEventListener("error", () => {
        if (!disposed) setConnection("disconnected");
      });
    };
    connect();
    return () => {
      disposed = true;
      sendPendingRef.current = () => {};
      clearResponseTimer();
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
    if (pendingRef.current.length)
      throw new Error("กรุณารอการยืนยันคำขอก่อนหน้า");
    const requestId = crypto.randomUUID();
    const payload = createDistributionPayload(request, requestId);
    pendingRef.current.push({ ...request, requestId, payload });
    setPending(true);
    sendPendingRef.current();
    return requestId;
  }, []);

  const hydrateJobs = useCallback((snapshots: FileDistributionJob[]) => {
    setJobs((current) => {
      const next = { ...current };
      for (const snapshot of snapshots) {
        let job = {
          ...snapshot,
          agents: { ...current[snapshot.id]?.agents, ...snapshot.agents },
        };
        for (const update of earlyUpdatesRef.current.values()) {
          if (update.job_id !== job.id) continue;
          const timestamp =
            job.agents[update.agent_id]?.updatedAt ?? job.updatedAt;
          if (
            !timestamp ||
            !update.updated_at ||
            Date.parse(update.updated_at) >= Date.parse(timestamp)
          )
            job = applyDistributionUpdate(job, update);
        }
        next[job.id] = job;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ connection, pending, jobs, distribute, hydrateJobs, retain }),
    [connection, pending, distribute, hydrateJobs, jobs, retain],
  );
  return <DistributionContext value={value}>{children}</DistributionContext>;
}

export function useFileDistribution() {
  const context = useContext(DistributionContext);
  if (!context)
    throw new Error(
      "useFileDistribution must be used inside FileDistributionProvider",
    );
  const { retain } = context;
  useEffect(() => retain(), [retain]);
  return context;
}
