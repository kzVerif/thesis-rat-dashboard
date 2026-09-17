"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getPowerErrorMessage, type PowerPhase } from "@/lib/power-control";

export function usePowerCommand<T>() {
  const active = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<PowerPhase>("idle");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  async function run(command: (signal: AbortSignal, onPending: () => void) => Promise<T>) {
    // A ref locks synchronously, including two clicks before React renders disabled.
    if (active.current) return undefined;
    const controller = new AbortController();
    active.current = controller;
    setPhase("connecting");
    setError(null);
    setResult(null);
    try {
      const value = await command(controller.signal, () => {
        if (!controller.signal.aborted) setPhase("pending");
      });
      if (controller.signal.aborted) return undefined;
      setResult(value);
      setPhase("success");
      return value;
    } catch (cause) {
      if (controller.signal.aborted) return undefined;
      const message = cause instanceof Error ? cause.message : getPowerErrorMessage();
      setError(message);
      setPhase("failure");
      toast.error(message);
      return undefined;
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  return { phase, result, error, pending: phase === "connecting" || phase === "pending", run };
}
