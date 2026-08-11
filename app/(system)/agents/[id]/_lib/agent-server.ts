import "server-only";

import type { AgentDetail } from "./types";

const backendUrl = (
  process.env.AGENTS_API_URL ?? process.env.ROOMS_API_URL
)?.replace(/\/$/, "");
const stoppedMockProcesses = new Map<string, Set<number>>();
const shutdownMockAgents = new Set<string>();

const processNames = [
  ["chrome.exe", 7.8, 842, "student"],
  ["Code.exe", 5.4, 624, "student"],
  ["MsMpEng.exe", 2.1, 286, "SYSTEM"],
  ["explorer.exe", 1.2, 148, "student"],
  ["node.exe", 0.8, 116, "student"],
] as const;

function mockAgent(id: string): AgentDetail {
  const number = Number(id.match(/\d+/)?.[0] ?? 1);
  const online = number % 4 !== 1 && !shutdownMockAgents.has(id);
  const stoppedPids = stoppedMockProcesses.get(id) ?? new Set<number>();
  return {
    id,
    name: `PC-LAB-${String(number).padStart(2, "0")}`,
    status: online ? "online" : "offline",
    room:
      number > 11
        ? null
        : {
            id: number <= 5 ? "room-1" : number <= 9 ? "room-2" : "room-3",
            name:
              number <= 5
                ? "ห้องปฏิบัติการ 1"
                : number <= 9
                  ? "ห้องปฏิบัติการ 2"
                  : "ห้องพักครู",
          },
    ip: `192.168.1.${100 + number}`,
    macAddress: `00:1B:44:11:3A:${String(9 + number).padStart(2, "0")}`,
    os: "Windows 11 Pro",
    lastSeen: online ? "ออนไลน์อยู่ขณะนี้" : "5 นาทีที่แล้ว",
    performance: {
      cpu: online ? 38 : 0,
      ram: { usedGb: online ? 9.7 : 0, totalGb: 16, percent: online ? 61 : 0 },
      disk: { usedGb: 286, totalGb: 476, percent: 60 },
    },
    processes: online
      ? processNames
          .map(([name, cpu, memoryMb, user], index) => ({
            pid: 1420 + index * 836,
            name,
            cpu,
            memoryMb,
            user,
          }))
          .filter((process) => !stoppedPids.has(process.pid))
      : [],
    measuredAt: new Date().toISOString(),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!backendUrl) throw new Error("AGENTS_API_URL is not configured");
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Agents backend returned ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getAgentDetail(id: string): Promise<AgentDetail> {
  if (!backendUrl) return mockAgent(id);
  return request<AgentDetail>(`/agents/${encodeURIComponent(id)}`);
}

export async function stopAgentProcess(id: string, pid: number): Promise<void> {
  if (!backendUrl) {
    const stoppedPids = stoppedMockProcesses.get(id) ?? new Set<number>();
    stoppedPids.add(pid);
    stoppedMockProcesses.set(id, stoppedPids);
    return;
  }
  await request<void>(
    `/agents/${encodeURIComponent(id)}/processes/${pid}/stop`,
    { method: "POST" }
  );
}

export async function shutdownAgent(id: string): Promise<void> {
  if (!backendUrl) {
    shutdownMockAgents.add(id);
    return;
  }
  await request<void>(`/agents/${encodeURIComponent(id)}/shutdown`, {
    method: "POST",
  });
}
