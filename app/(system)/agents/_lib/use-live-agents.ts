"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveAgent } from "./types";

export type LiveConnection = "connecting" | "live" | "reconnecting" | "error";

const socketUrl = process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "ws://localhost:8081/ws/frontend";

function isLiveAgent(value: unknown): value is LiveAgent {
  if (!value || typeof value !== "object") return false;
  const agent = value as Record<string, unknown>;
  return typeof agent.id === "string" && typeof agent.hostname === "string" && typeof agent.status === "string";
}

// The socket may omit keys or send "" for missing values; the update form needs null for those.
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
function normalize(agent: LiveAgent): LiveAgent {
  return {
    ...agent,
    room_id: text(agent.room_id),
    room_name: text(agent.room_name) ?? undefined,
    os_info: agent.os_info && typeof agent.os_info === "object" ? agent.os_info : null,
    ip_address: text(agent.ip_address)?.split("/")[0] ?? null,
    mac_address: text(agent.mac_address),
    last_seen: text(agent.last_seen),
  };
}

/**
 * Subscribes to the agents list on /ws/frontend (see ws_docs/frontend-agents.md).
 * `agents` stays null until the first snapshot arrives; afterwards it is keyed by agent id
 * and every agent_update is upserted into it.
 */
export function useLiveAgents() {
  const [agents, setAgents] = useState<Map<string, LiveAgent> | null>(null);
  const [connection, setConnection] = useState<LiveConnection>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let retries = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setConnection(retries ? "reconnecting" : "connecting");
      socket = new WebSocket(socketUrl);
      socket.addEventListener("open", () => {
        retries = 0;
        setConnection("live");
        socket?.send(JSON.stringify({ type: "agents", action: "list" }));
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let message: { type?: unknown; action?: unknown; data?: unknown; error?: unknown };
        try { message = JSON.parse(event.data); } catch { return; }
        if (!message || typeof message !== "object") return;

        if (message.type === "agents" && message.action === "snapshot" && Array.isArray(message.data)) {
          setAgents(new Map(message.data.filter(isLiveAgent).map((agent) => [agent.id, normalize(agent)])));
          setError(null);
        } else if (message.type === "agents" && message.action === "error") {
          setError(typeof message.error === "string" ? message.error : "cannot load agents");
        } else if (message.type === "agent_update" && isLiveAgent(message.data)) {
          const agent = normalize(message.data);
          setAgents((current) => {
            if (!current) return current;
            const next = new Map(current);
            next.set(agent.id, { ...next.get(agent.id), ...agent });
            return next;
          });
        }
      });
      socket.addEventListener("close", () => {
        if (disposed) return;
        retries += 1;
        setConnection("reconnecting");
        reconnectTimer = window.setTimeout(connect, Math.min(1_000 * 2 ** (retries - 1), 15_000));
      });
      socket.addEventListener("error", () => setConnection("error"));
    };
    connect();
    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // Local edits (rename / move room / delete) are not pushed by the server, so apply them here too.
  const upsert = useCallback((agent: LiveAgent) => {
    setAgents((current) => {
      if (!current) return current;
      const next = new Map(current);
      next.set(agent.id, { ...next.get(agent.id), ...agent });
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => {
    setAgents((current) => {
      if (!current) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  return { agents, connection, error, upsert, remove };
}
