"use client";

import { useState } from "react";
import { Add01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { createUserAction, deleteUserAction, updateUserAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import type { RoleOption, User } from "../_lib/types";
import DeleteDialog from "./DeleteDialog";
import UserFormDialog, { type UserFormValues } from "./UserFormDialog";
import UserTable from "./UserTable";

export default function UserContent({ initialUsers, roles }: { initialUsers: User[]; roles: RoleOption[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  async function create(values: UserFormValues) {
    const result = await createUserAction(values);
    if (!result.ok) { toast.error("ไม่สามารถเพิ่มผู้ใช้ได้", { description: result.error }); return; }
    setUsers((current) => [...current, result.data]);
    setCreateOpen(false);
    toast.success("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
  }

  async function update(values: UserFormValues) {
    if (!editingUser) return;
    const result = await updateUserAction({ ...values, id: editingUser.id });
    if (!result.ok) { toast.error("ไม่สามารถแก้ไขผู้ใช้ได้", { description: result.error }); return; }
    setUsers((current) => current.map((user) => user.id === result.data.id ? result.data : user));
    setEditingUser(null);
    toast.success("แก้ไขผู้ใช้งานเรียบร้อยแล้ว");
  }

  async function remove() {
    if (!deletingUser) return;
    const result = await deleteUserAction(deletingUser.id);
    if (!result.ok) { toast.error("ไม่สามารถลบผู้ใช้ได้", { description: result.error }); return; }
    setUsers((current) => current.filter((user) => user.id !== deletingUser.id));
    setDeletingUser(null);
    toast.success("ลบผู้ใช้งานเรียบร้อยแล้ว");
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><HugeiconsIcon icon={UserMultipleIcon} className="size-6" /></span>
          <div><h2 className="text-lg font-semibold text-slate-950 dark:text-white">ผู้ใช้งานในระบบ <span className="ml-1 text-sm font-normal text-slate-500">{users.length} บัญชี</span></h2><p className="mt-1 text-sm text-slate-500">จัดการข้อมูล Role และสถานะบัญชีผู้ใช้</p></div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700"><HugeiconsIcon icon={Add01Icon} className="mr-1 size-4" />เพิ่มผู้ใช้งาน</Button>
      </div>
      <UserTable users={users} onEdit={setEditingUser} onDelete={setDeletingUser} />
      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} title="เพิ่มผู้ใช้งาน" roles={roles} onSubmit={create} />
      {editingUser && <UserFormDialog key={editingUser.id} open onOpenChange={(open) => !open && setEditingUser(null)} title="แก้ไขผู้ใช้งาน" user={editingUser} roles={roles} onSubmit={update} />}
      <DeleteDialog user={deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)} onConfirm={remove} />
    </section>
  );
}
