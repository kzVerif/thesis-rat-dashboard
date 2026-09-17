import {
  powerTargetIdSchema, PowerControlError, powerErrorResponseSchema, powerRoomShutdownResultSchema,
  powerShutdownResultSchema, type PowerRequest, type PowerResult,
  type PowerRoomShutdownResult, type PowerShutdownResult,
} from "./power-control";

// Allow 5 seconds beyond the server's ~10-second deadline after sending.
// Connection establishment has its own bound so a slow handshake does not shorten this window.
export const POWER_TIMEOUT_MS = 15_000;
type Options = { signal?: AbortSignal; onPending?: () => void };

function requestPower(request: PowerRequest, { signal, onPending }: Options): Promise<PowerResult> {
  return new Promise((resolve, reject) => {
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    let sent = false;

    const finish = (result?: PowerResult, error?: PowerControlError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState < 2) socket.close();
      }
      if (error) reject(error);
      else if (result) resolve(result);
    };
    const abort = () => finish(undefined, new PowerControlError("cancelled"));
    const armTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(undefined, new PowerControlError("communication_timeout")), POWER_TIMEOUT_MS);
    };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener("abort", abort, { once: true });

    try {
      // Browser supplies existing eligible session cookies in the handshake.
      // No auth material belongs in the URL or command payload.
      socket = new WebSocket(process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "ws://localhost:8081/ws/frontend");
      armTimeout();
      socket.onopen = () => {
        if (settled || sent) return;
        try {
          socket!.send(JSON.stringify(request));
          sent = true;
          armTimeout();
          onPending?.();
        } catch { finish(undefined, new PowerControlError("send_failed")); }
      };
      socket.onmessage = (event) => {
        if (settled || !sent || typeof event.data !== "string") return;
        let raw: unknown;
        try { raw = JSON.parse(event.data); } catch { return; }
        const error = powerErrorResponseSchema.safeParse(raw);
        if (error.success) {
          const value = error.data;
          if (value.request_id !== request.request_id || value.action !== request.action) return;
          const matches = request.action === "shutdown"
            ? (!value.agent_id || value.agent_id === request.agent_id) && !value.room_id
            : (!value.room_id || value.room_id === request.room_id) && !value.agent_id;
          if (matches) finish(undefined, new PowerControlError(value.code));
          return;
        }
        if (request.action === "shutdown") {
          const parsed = powerShutdownResultSchema.safeParse(raw);
          if (!parsed.success || parsed.data.request_id !== request.request_id || parsed.data.agent_id !== request.agent_id) return;
          finish(parsed.data);
        } else {
          const parsed = powerRoomShutdownResultSchema.safeParse(raw);
          if (!parsed.success || parsed.data.request_id !== request.request_id || parsed.data.room_id !== request.room_id) return;
          finish(parsed.data);
        }
      };
      socket.onerror = () => finish(undefined, new PowerControlError("connection_error"));
      socket.onclose = () => finish(undefined, new PowerControlError("connection_closed"));
    } catch { finish(undefined, new PowerControlError("connection_error")); }
  });
}

export async function shutdownAgent(agentId: string, options: Options = {}): Promise<PowerShutdownResult> {
  if (!powerTargetIdSchema.safeParse(agentId).success) throw new PowerControlError("invalid_request");
  const result = await requestPower({
    type: "power", action: "shutdown", agent_id: agentId, request_id: crypto.randomUUID(),
  }, options);
  if (result.action !== "shutdown_result") throw new PowerControlError("invalid_request");
  if (!result.success) throw new PowerControlError(result.code ?? "execution_failed");
  return result;
}

export async function shutdownRoom(roomId: string, options: Options = {}): Promise<PowerRoomShutdownResult> {
  if (!powerTargetIdSchema.safeParse(roomId).success) throw new PowerControlError("invalid_request");
  const result = await requestPower({
    type: "power", action: "shutdown_room", room_id: roomId, request_id: crypto.randomUUID(),
  }, options);
  if (result.action !== "shutdown_room_result") throw new PowerControlError("invalid_request");
  return result;
}
