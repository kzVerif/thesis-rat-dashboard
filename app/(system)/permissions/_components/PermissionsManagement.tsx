"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit03Icon, Search01Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "@/actions/rbac";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMINISTRATOR_ROLE_ID, type Permission, type Role, type RoleInput } from "../_lib/types";

type Props = { initialRoles: Role[]; permissions: Permission[]; loadError: string | null };
type PermissionGroup = { name: string; permissions: Permission[] };

export default function PermissionsManagement({ initialRoles, permissions, loadError }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleRoles = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("th");
    return search ? initialRoles.filter((role) => `${role.name} ${role.description ?? ""}`.toLocaleLowerCase("th").includes(search)) : initialRoles;
  }, [initialRoles, query]);

  const saveRole = (input: RoleInput) => startTransition(async () => {
    const result = editing ? await updateRoleAction(editing.id, input) : await createRoleAction(input);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(editing ? "บันทึกการแก้ไขบทบาทแล้ว" : "เพิ่มบทบาทใหม่แล้ว");
    setCreating(false); setEditing(null); router.refresh();
  });

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteRoleAction(deleting.id);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(`ลบบทบาท ${deleting.name} แล้ว`);
      setDeleting(null); router.refresh();
    });
  };

  if (loadError) return <LoadError message={loadError} onRetry={() => router.refresh()} />;

  return <>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">รายการบทบาท</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{initialRoles.length} บทบาท</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ข้อมูลบทบาทและสิทธิ์จากระบบหลังบ้าน</p></div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="relative min-w-0 flex-1 lg:w-72"><span className="sr-only">ค้นหาบทบาท</span><HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบทบาท..." className="h-10 pl-9" /></label>
            <Button onClick={() => setCreating(true)} disabled={isPending || permissions.length === 0} size="lg" className="h-10 bg-blue-600 text-white hover:bg-blue-700"><HugeiconsIcon icon={Add01Icon} /> เพิ่มบทบาท</Button>
          </div>
        </div>
      </div>
      {visibleRoles.length ? <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-5">{visibleRoles.map((role) => {
        const protectedRole = role.id === ADMINISTRATOR_ROLE_ID;
        return <article key={role.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-4 transition-shadow hover:shadow-md dark:border-slate-800">
          <div className="flex items-start justify-between gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><HugeiconsIcon icon={SecurityCheckIcon} className="size-6" /></span>{protectedRole && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">บทบาทหลัก</span>}</div>
          <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{role.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">{role.description || "ไม่มีคำอธิบาย"}</p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60"><span className="text-slate-500">สิทธิ์ที่อนุญาต</span><strong className="text-blue-600">{role.permission_ids.length} / {permissions.length}</strong></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: permissions.length ? `${role.permission_ids.length / permissions.length * 100}%` : "0%" }} /></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" size="lg" disabled={isPending} onClick={() => setEditing(role)}><HugeiconsIcon icon={Edit03Icon} /> แก้ไข</Button><Button variant="destructive" size="lg" disabled={protectedRole || isPending} onClick={() => setDeleting(role)} title={protectedRole ? "API ไม่อนุญาตให้ลบบทบาท administrator" : undefined}><HugeiconsIcon icon={Delete02Icon} /> ลบ</Button></div>
        </article>;
      })}</div> : <EmptyState hasQuery={Boolean(query)} />}
      {permissions.length === 0 && <div className="border-t border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">ระบบหลังบ้านยังไม่มี Permission กรุณาสร้าง Permission ก่อนเพิ่มบทบาท</div>}
    </section>
    {(creating || editing) && <RoleDialog role={editing} roles={initialRoles} permissions={permissions} pending={isPending} onClose={() => { if (!isPending) { setCreating(false); setEditing(null); } }} onSave={saveRole} />}
    <DeleteDialog role={deleting} pending={isPending} onClose={() => !isPending && setDeleting(null)} onConfirm={confirmDelete} />
  </>;
}

function RoleDialog({ role, roles, permissions, pending, onClose, onSave }: { role: Role | null; roles: Role[]; permissions: Permission[]; pending: boolean; onClose: () => void; onSave: (input: RoleInput) => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<string[]>(role?.permission_ids ?? []);
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const duplicate = roles.some((item) => item.id !== role?.id && item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleGroup = (group: PermissionGroup) => { const ids = group.permissions.map((permission) => permission.id); const checked = ids.every((id) => selected.includes(id)); setSelected((current) => checked ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!duplicate) onSave({ name: name.trim(), description: description.trim() || null, permission_ids: selected }); };
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto font-kanit sm:max-w-2xl"><DialogHeader><DialogTitle className="text-base">{role ? "แก้ไขบทบาท" : "เพิ่มบทบาทใหม่"}</DialogTitle><DialogDescription>รายการ Permission ดึงจากระบบหลังบ้านและบันทึกด้วย UUID</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="role-name">ชื่อบทบาท</Label><Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น OPERATOR" className="h-10" maxLength={50} disabled={pending} required /><p className={`text-xs ${duplicate ? "text-red-500" : "text-slate-500"}`}>{duplicate ? "มีชื่อบทบาทนี้อยู่แล้ว" : "สูงสุด 50 ตัวอักษร"}</p></div><div className="space-y-2"><Label htmlFor="role-description">คำอธิบาย (ไม่บังคับ)</Label><Input id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="หน้าที่ของบทบาทนี้" className="h-10" disabled={pending} /></div></div>
    <div><div className="mb-3 flex items-center justify-between"><div><Label>สิทธิ์การใช้งาน</Label><p className="mt-1 text-xs text-slate-500">เลือกแล้ว {selected.length} จาก {permissions.length} สิทธิ์</p></div><button type="button" disabled={pending} onClick={() => setSelected(selected.length === permissions.length ? [] : permissions.map((permission) => permission.id))} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50">{selected.length === permissions.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</button></div>
      <div className="space-y-3">{groups.map((group) => { const ids = group.permissions.map((permission) => permission.id); const checked = ids.every((id) => selected.includes(id)); return <div key={group.name} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"><label className="flex cursor-pointer items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/60"><input type="checkbox" checked={checked} disabled={pending} onChange={() => toggleGroup(group)} className="size-4 accent-blue-600" /><span className="text-sm font-semibold">{group.name}</span><span className="ml-auto text-xs text-slate-500">{ids.filter((id) => selected.includes(id)).length}/{ids.length}</span></label><div className="grid sm:grid-cols-2">{group.permissions.map((permission) => <label key={permission.id} className="flex cursor-pointer items-start gap-3 border-t border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"><input type="checkbox" checked={selected.includes(permission.id)} disabled={pending} onChange={() => toggle(permission.id)} className="mt-0.5 size-4 accent-blue-600" /><span><code className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{permission.code}</code><span className="mt-0.5 block text-xs leading-4 text-slate-500">{permission.description || "ไม่มีคำอธิบาย"}</span></span></label>)}</div></div>; })}</div>
    </div><DialogFooter><Button type="button" variant="outline" size="lg" disabled={pending} onClick={onClose}>ยกเลิก</Button><Button type="submit" size="lg" disabled={pending || duplicate || !name.trim()} className="bg-blue-600 text-white hover:bg-blue-700">{pending ? "กำลังบันทึก..." : role ? "บันทึกการแก้ไข" : "เพิ่มบทบาท"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function DeleteDialog({ role, pending, onClose, onConfirm }: { role: Role | null; pending: boolean; onClose: () => void; onConfirm: () => void }) { return <Dialog open={role !== null} onOpenChange={(open) => !open && onClose()}><DialogContent className="font-kanit sm:max-w-md"><DialogHeader><DialogTitle>ยืนยันการลบบทบาท</DialogTitle><DialogDescription>คุณกำลังจะลบบทบาท “{role?.name}” หากมีผู้ใช้งานบทบาทนี้อยู่ backend จะปฏิเสธการลบ</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" size="lg" disabled={pending} onClick={onClose}>ยกเลิก</Button><Button variant="destructive" size="lg" disabled={pending} onClick={onConfirm}>{pending ? "กำลังลบ..." : "ยืนยันการลบ"}</Button></DialogFooter></DialogContent></Dialog>; }
function EmptyState({ hasQuery }: { hasQuery: boolean }) { return <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center"><HugeiconsIcon icon={SecurityCheckIcon} className="size-10 text-slate-300" /><h3 className="mt-3 font-semibold">{hasQuery ? "ไม่พบบทบาท" : "ยังไม่มีบทบาท"}</h3><p className="mt-1 text-sm text-slate-500">{hasQuery ? "ลองค้นหาด้วยชื่ออื่น" : "เพิ่มบทบาทแรกเพื่อเริ่มกำหนดสิทธิ์"}</p></div>; }
function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-900"><HugeiconsIcon icon={SecurityCheckIcon} className="mx-auto size-10 text-red-400" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">โหลดข้อมูลไม่สำเร็จ</h2><p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p><Button className="mt-4" onClick={onRetry}>ลองอีกครั้ง</Button></div>; }
function groupPermissions(permissions: Permission[]): PermissionGroup[] { const groups = new Map<string, Permission[]>(); for (const permission of permissions) { const prefix = permission.code.split(/[.:]/)[0] || "other"; const current = groups.get(prefix) ?? []; current.push(permission); groups.set(prefix, current); } return [...groups.entries()].map(([name, items]) => ({ name: name.toUpperCase(), permissions: items })); }
