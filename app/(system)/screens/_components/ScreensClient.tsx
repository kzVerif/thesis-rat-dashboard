"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ComputerIcon, ComputerScreenShareIcon, MeetingRoomIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ScreenAgent, ScreensSnapshot } from "../_lib/types";

type ConnectionState = "connecting" | "live" | "reconnecting" | "error";
type ScreenHeader = { type: "screen"; agent_id: string; room_id: string };
const socketUrl = process.env.NEXT_PUBLIC_FRONTEND_WS_URL ?? "ws://localhost:8081/ws/frontend";

export default function ScreensClient({ initialSnapshot }: { initialSnapshot: ScreensSnapshot }) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const imageUrlsRef = useRef(new Map<string, string>());
  const selectedRoom = initialSnapshot.rooms.find((room) => room.id === selectedRoomId);
  const visibleScreens = useMemo(
    () => initialSnapshot.agents.filter((agent) => agent.roomId === selectedRoomId),
    [initialSnapshot.agents, selectedRoomId],
  );

  useEffect(() => {
    if (!selectedRoomId) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let retries = 0;
    let disposed = false;
    let pendingFrame: ScreenHeader | null = null;

    const connect = () => {
      if (disposed) return;
      setConnection(retries ? "reconnecting" : "connecting");
      socket = new WebSocket(socketUrl);
      socket.binaryType = "arraybuffer";
      socket.addEventListener("open", () => {
        retries = 0;
        setConnection("live");
        socket?.send(JSON.stringify({ type: "screen", action: "start", room_id: selectedRoomId }));
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          try {
            const message: unknown = JSON.parse(event.data);
            pendingFrame = isScreenHeader(message) && message.room_id === selectedRoomId ? message : null;
          } catch { pendingFrame = null; }
          return;
        }
        if (!pendingFrame) return;
        const agentId = pendingFrame.agent_id;
        pendingFrame = null;
        const nextUrl = URL.createObjectURL(new Blob([event.data], { type: "image/jpeg" }));
        const previousUrl = imageUrlsRef.current.get(agentId);
        imageUrlsRef.current.set(agentId, nextUrl);
        setImageUrls((current) => ({ ...current, [agentId]: nextUrl }));
        if (previousUrl) URL.revokeObjectURL(previousUrl);
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
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "screen", action: "stop", room_id: selectedRoomId }));
      }
      socket?.close();
    };
  }, [selectedRoomId]);

  useEffect(() => () => {
    imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageUrlsRef.current.clear();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Screen Monitoring</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">ตรวจสอบหน้าจอ Agents</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">เลือกห้องเพื่อดูภาพหน้าจอของ Agents ภายในห้องแบบ View-only</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">เลือกห้อง</h2>
        <p className="text-sm text-slate-500">ระบบจะเริ่มรับภาพเมื่อเลือกห้องที่ต้องการตรวจสอบ</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {initialSnapshot.rooms.map((room) => {
            const selected = room.id === selectedRoomId;
            return <button key={room.id} type="button" onClick={() => setSelectedRoomId(room.id)} className={`flex min-w-0 items-center gap-3 rounded-xl border p-4 text-left transition-all ${selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/30" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"}`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"><HugeiconsIcon icon={MeetingRoomIcon} className="size-6" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{room.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{room.description ?? "ไม่มีรายละเอียด"} • {room.onlineAgentCount}/{room.agentCount} ออนไลน์</span></span>
              <span aria-hidden="true" className={`size-4 shrink-0 rounded-full border-4 ${selected ? "border-blue-600 bg-white" : "border-slate-300 dark:border-slate-600"}`} />
            </button>;
          })}
        </div>
      </section>
      {selectedRoom ? <section className="mt-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">{selectedRoom.name}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{visibleScreens.length} หน้าจอ</span></div><p className="mt-1 text-sm text-slate-500">แสดงภาพเท่านั้น ไม่มีการควบคุมเครื่องจากหน้านี้</p></div><ConnectionBadge state={connection} /></div>
        {visibleScreens.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{visibleScreens.map((screen) => <ScreenPreview key={screen.id} screen={screen} imageUrl={imageUrls[screen.id] ?? null} />)}</div> : <EmptyState title="ไม่มี Agent ในห้องนี้" description="ยังไม่มี Agent ที่ถูกกำหนดให้อยู่ในห้องนี้" />}
      </section> : <EmptyState title="ยังไม่ได้เลือกห้อง" description="เลือกห้องด้านบนเพื่อแสดงหน้าจอ Agents ที่อยู่ภายในห้อง" />}
    </div>
  );
}

function ScreenPreview({ screen, imageUrl }: { screen: ScreenAgent; imageUrl: string | null }) {
  const offline = screen.status !== "ONLINE";
  return <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="relative aspect-video overflow-hidden bg-slate-950">{imageUrl ? <ScreenImage src={imageUrl} name={screen.name} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"><HugeiconsIcon icon={ComputerIcon} className={`size-8 ${offline ? "text-slate-700" : "text-slate-500"}`} /><span className="text-xs text-slate-500">{offline ? "Agent ออฟไลน์" : "รอรับภาพผ่าน Socket"}</span></div>}<span className={`absolute right-2 top-2 size-2.5 rounded-full ring-2 ring-slate-950 ${offline ? "bg-slate-500" : imageUrl ? "bg-emerald-500" : "bg-amber-500"}`} /></div><div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5"><span className="truncate text-xs font-semibold text-slate-900 dark:text-white">{screen.name}</span><span className="shrink-0 text-[10px] text-slate-500">{offline ? "Offline" : imageUrl ? "Live" : "Waiting"}</span></div></article>;
}

function ScreenImage({ src, name }: { src: string; name: string }) {
  // A blob URL is a live frame generated in the browser and cannot use next/image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`หน้าจอ ${name}`} className="size-full object-contain" />;
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const content = { connecting: ["กำลังเชื่อมต่อ Socket", "border-blue-200 bg-blue-50 text-blue-700"], live: ["Socket เชื่อมต่อแล้ว", "border-emerald-200 bg-emerald-50 text-emerald-700"], reconnecting: ["กำลังเชื่อมต่อใหม่", "border-amber-200 bg-amber-50 text-amber-700"], error: ["เชื่อมต่อ Socket ไม่สำเร็จ", "border-red-200 bg-red-50 text-red-700"] } satisfies Record<ConnectionState, [string, string]>;
  const [label, className] = content[state];
  return <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${className}`}><span className="size-2 rounded-full bg-current" />{label}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50"><span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><HugeiconsIcon icon={ComputerScreenShareIcon} className="size-8" /></span><h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p></section>;
}

function isScreenHeader(value: unknown): value is ScreenHeader {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ScreenHeader>;
  return message.type === "screen" && typeof message.agent_id === "string" && typeof message.room_id === "string";
}
