"use client";

import { useMemo, useState } from "react";
import {
  ComputerIcon,
  ComputerScreenShareIcon,
  MeetingRoomIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Room = {
  id: string;
  name: string;
  description: string;
  agentCount: number;
};

type AgentScreen = {
  id: string;
  name: string;
  roomId: string;
  status: "waiting" | "offline";
  imageUrl: string | null;
};

const rooms: Room[] = [
  { id: "room-1", name: "ห้องปฏิบัติการ 1", description: "อาคาร 4 ชั้น 2", agentCount: 12 },
  { id: "room-2", name: "ห้องปฏิบัติการ 2", description: "อาคาร 4 ชั้น 3", agentCount: 10 },
  { id: "room-3", name: "ห้องปฏิบัติการ 3", description: "อาคาร 5 ชั้น 2", agentCount: 8 },
  { id: "room-4", name: "ห้องพักครู", description: "อาคาร 2 ชั้น 1", agentCount: 6 },
];

const agentScreens: AgentScreen[] = rooms.flatMap((room) =>
  Array.from({ length: room.agentCount }, (_, index) => ({
    id: `${room.id}-agent-${index + 1}`,
    name: `PC-${room.id.slice(-1)}-${String(index + 1).padStart(2, "0")}`,
    roomId: room.id,
    status: index % 7 === 0 ? "offline" : "waiting",
    imageUrl: null,
  }))
);

export default function ScreensClient() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const visibleScreens = useMemo(
    () => agentScreens.filter((screen) => screen.roomId === selectedRoomId),
    [selectedRoomId]
  );

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Screen Monitoring
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          ตรวจสอบหน้าจอ Agents
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          เลือกห้องเพื่อดูภาพหน้าจอของ Agents ภายในห้องแบบ View-only
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            เลือกห้อง
          </h2>
          <p className="text-sm text-slate-500">
            ภาพหน้าจอจะแสดงหลังจากเลือกห้องที่ต้องการตรวจสอบ
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => {
            const selected = selectedRoomId === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoomId(room.id)}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                }`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                  <HugeiconsIcon icon={MeetingRoomIcon} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {room.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {room.description} • {room.agentCount} เครื่อง
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`size-4 shrink-0 rounded-full border-4 ${
                    selected
                      ? "border-blue-600 bg-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {selectedRoom ? (
        <section className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {selectedRoom.name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {visibleScreens.length} หน้าจอ
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                แสดงภาพเท่านั้น ไม่มีการควบคุมเครื่องจากหน้านี้
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <span className="size-2 rounded-full bg-amber-500" />
              รอเชื่อมต่อ Socket
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleScreens.map((screen) => (
              <ScreenPreview key={screen.id} screen={screen} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <HugeiconsIcon icon={ComputerScreenShareIcon} className="size-8" />
          </span>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            ยังไม่ได้เลือกห้อง
          </h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            เลือกห้องด้านบนเพื่อแสดงหน้าจอ Agents ที่อยู่ภายในห้อง
          </p>
        </section>
      )}
    </div>
  );
}

function ScreenPreview({ screen }: { screen: AgentScreen }) {
  // Socket integration placeholder:
  // imageUrl will be replaced with the latest frame received for this agent.
  const offline = screen.status === "offline";

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        {screen.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screen.imageUrl}
            alt={`หน้าจอ ${screen.name}`}
            className="size-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <HugeiconsIcon
              icon={ComputerIcon}
              className={`size-8 ${offline ? "text-slate-700" : "text-slate-500"}`}
            />
            <span className="text-xs text-slate-500">
              {offline ? "Agent ออฟไลน์" : "รอรับภาพผ่าน Socket"}
            </span>
          </div>
        )}
        <span
          className={`absolute right-2 top-2 size-2.5 rounded-full ring-2 ring-slate-950 ${
            offline ? "bg-slate-500" : "bg-amber-500"
          }`}
          aria-label={offline ? "ออฟไลน์" : "รอรับภาพ"}
        />
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
        <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
          {screen.name}
        </span>
        <span className="shrink-0 text-[10px] text-slate-500">
          {offline ? "Offline" : "Waiting"}
        </span>
      </div>
    </article>
  );
}
