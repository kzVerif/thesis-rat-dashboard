"use client";

import { useMemo, useState } from "react";
import { Add01Icon, MeetingRoomIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { createRoomAction, deleteRoomAction, updateRoomAction } from "@/actions/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Room } from "../_lib/types";
import DeleteRoomDialog from "./DeleteRoomDialog";
import RoomCard from "./RoomCard";
import RoomFormDialog from "./RoomFormDialog";
import ShutdownRoomDialog from "./ShutdownRoomDialog";

export default function RoomManagement({ initialRooms }: { initialRooms: Room[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [shutdownRoom, setShutdownRoom] = useState<Room | null>(null);

  const visibleRooms = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return rooms;
    return rooms.filter((room) =>
      room.name.toLocaleLowerCase().includes(value) ||
      (room.description ?? "").toLocaleLowerCase().includes(value)
    );
  }, [query, rooms]);

  async function handleCreate(name: string, description: string) {
    const result = await createRoomAction({ name, description });
    if (!result.ok) {
      toast.error("ไม่สามารถเพิ่มห้องได้", { description: result.error });
      return;
    }
    setRooms((current) => [...current, result.data]);
    setCreateOpen(false);
    toast.success("เพิ่มห้องเรียบร้อยแล้ว");
  }

  async function handleEdit(name: string, description: string) {
    if (!editingRoom) return;
    const result = await updateRoomAction({ id: editingRoom.id, name, description });
    if (!result.ok) {
      toast.error("ไม่สามารถแก้ไขห้องได้", { description: result.error });
      return;
    }
    setRooms((current) => current.map((room) => room.id === result.data.id ? result.data : room));
    setEditingRoom(null);
    toast.success("แก้ไขข้อมูลห้องเรียบร้อยแล้ว");
  }

  async function handleDelete() {
    if (!deletingRoom) return;
    const result = await deleteRoomAction(deletingRoom.id);
    if (!result.ok) {
      toast.error("ไม่สามารถลบห้องได้", { description: result.error });
      return;
    }
    setRooms((current) => current.filter((room) => room.id !== deletingRoom.id));
    setDeletingRoom(null);
    toast.success("ลบห้องเรียบร้อยแล้ว");
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">ห้องภายในระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">ค้นหา เพิ่ม แก้ไข และลบข้อมูลห้อง</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-72">
              <span className="sr-only">ค้นหาห้อง</span>
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อหรือรายละเอียด..." className="h-10 pl-9" />
            </label>
            <Button onClick={() => setCreateOpen(true)} className="h-10 bg-blue-600 text-white hover:bg-blue-700">
              <HugeiconsIcon icon={Add01Icon} className="mr-1 size-4" />เพิ่มห้อง
            </Button>
          </div>
        </div>
        {visibleRooms.length ? (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleRooms.map((room) => <RoomCard key={room.id} room={room} onEdit={setEditingRoom} onDelete={setDeletingRoom} onShutdown={setShutdownRoom} />)}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <HugeiconsIcon icon={MeetingRoomIcon} className="mb-3 size-9 text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">ไม่พบห้อง</h3>
            <p className="mt-1 text-sm text-slate-500">ลองค้นหาด้วยคำอื่นหรือเพิ่มห้องใหม่</p>
          </div>
        )}
      </section>
      <RoomFormDialog open={createOpen} onOpenChange={setCreateOpen} title="เพิ่มห้องใหม่" onSubmit={handleCreate} />
      {editingRoom && <RoomFormDialog key={editingRoom.id} open onOpenChange={(open) => !open && setEditingRoom(null)} title="แก้ไขข้อมูลห้อง" initialRoom={editingRoom} onSubmit={handleEdit} />}
      <DeleteRoomDialog room={deletingRoom} onOpenChange={(open) => !open && setDeletingRoom(null)} onConfirm={handleDelete} />
      <ShutdownRoomDialog
        room={shutdownRoom}
        onOpenChange={(open) => !open && setShutdownRoom(null)}
        onConfirm={() => {
          toast.info("ยังไม่ได้เชื่อมต่อคำสั่งปิดเครื่องกับระบบหลังบ้าน", {
            description: shutdownRoom ? `${shutdownRoom.name} • ${shutdownRoom.agent_count} Agents` : undefined,
          });
          setShutdownRoom(null);
        }}
      />
    </>
  );
}
