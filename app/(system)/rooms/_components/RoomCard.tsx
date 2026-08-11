import { Delete02Icon, Edit03Icon, MeetingRoomIcon, ShutDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import type { Room } from "../_lib/types";

export default function RoomCard({ room, onEdit, onDelete, onShutdown }: { room: Room; onEdit: (room: Room) => void; onDelete: (room: Room) => void; onShutdown: (room: Room) => void }) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-4 transition-shadow hover:shadow-md dark:border-slate-800">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><HugeiconsIcon icon={MeetingRoomIcon} className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-950 dark:text-white">{room.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{room.description || "ไม่มีรายละเอียด"}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
        <AgentCount label="ทั้งหมด" value={room.agent_count} className="text-slate-700 dark:text-slate-200" />
        <AgentCount label="ออนไลน์" value={room.online_agent_count} className="text-emerald-600 dark:text-emerald-400" />
        <AgentCount label="ออฟไลน์" value={room.offline_agent_count} className="text-slate-500 dark:text-slate-400" />
      </div>
      <p className="mt-4 text-xs text-slate-400">แก้ไขล่าสุด {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(room.updated_at))}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(room)}><HugeiconsIcon icon={Edit03Icon} className="mr-1 size-4" />แก้ไข</Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(room)}><HugeiconsIcon icon={Delete02Icon} className="mr-1 size-4" />ลบ</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onShutdown(room)} disabled={room.agent_count === 0} className="col-span-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"><HugeiconsIcon icon={ShutDownIcon} className="mr-1 size-4" />ปิดเครื่องทั้งหมดในห้อง</Button>
      </div>
    </article>
  );
}

function AgentCount({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className={`text-lg font-bold ${className}`}>{value}</p>
      <p className="truncate text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
