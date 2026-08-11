"use client";

import { useMemo, useState } from "react";
import { Delete02Icon, PencilEdit02Icon, Search01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { User, UserStatus } from "../_lib/types";

const PAGE_SIZE = 10;

export default function UserTable({ users, onEdit, onDelete }: { users: User[]; onEdit: (user: User) => void; onDelete: (user: User) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const visibleUsers = useMemo(() => { const value = query.trim().toLocaleLowerCase(); return value ? users.filter((user) => [user.display_name, user.username, user.email, user.role].some((field) => field?.toLocaleLowerCase().includes(value))) : users; }, [query, users]);
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedUsers = visibleUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return (
    <div>
      <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5"><label className="relative block w-full sm:max-w-sm"><span className="sr-only">ค้นหาผู้ใช้งาน</span><HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ ผู้ใช้ อีเมล หรือ Role..." className="h-10 pl-9" /></label></div>
      {!visibleUsers.length ? <EmptyState /> : (
        <>
          <div className="hidden overflow-x-auto md:block"><Table><TableHeader className="bg-slate-50/80 dark:bg-slate-950/40"><TableRow><TableHead className="pl-5">ผู้ใช้งาน</TableHead><TableHead>Role</TableHead><TableHead>สถานะ</TableHead><TableHead>เข้าสู่ระบบล่าสุด</TableHead><TableHead className="pr-5 text-right">จัดการ</TableHead></TableRow></TableHeader><TableBody>{paginatedUsers.map((user) => <TableRow key={user.id}><TableCell className="py-3 pl-5"><Identity user={user} /></TableCell><TableCell>{user.role}</TableCell><TableCell><Status status={user.status} /></TableCell><TableCell className="text-sm text-slate-500">{formatDate(user.last_login_at)}</TableCell><TableCell className="pr-5"><Actions user={user} onEdit={onEdit} onDelete={onDelete} /></TableCell></TableRow>)}</TableBody></Table></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">{paginatedUsers.map((user) => <article key={user.id} className="space-y-3 p-4"><Identity user={user} /><div className="flex items-center justify-between text-sm"><span>{user.role}</span><Status status={user.status} /></div><Actions user={user} onEdit={onEdit} onDelete={onDelete} /></article>)}</div>
        </>
      )}
      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between">
        <p>แสดง {visibleUsers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, visibleUsers.length)} จาก {visibleUsers.length} บัญชี</p>
        {pageCount > 1 && <UserPagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />}
      </footer>
    </div>
  );
}

function UserPagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return <Pagination className="mx-0 w-auto justify-start sm:justify-end"><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""} onClick={(event) => { event.preventDefault(); onPageChange(Math.max(1, page - 1)); }} /></PaginationItem>{pages.map((number) => <PaginationItem key={number}><PaginationLink href="#" isActive={number === page} onClick={(event) => { event.preventDefault(); onPageChange(number); }}>{number}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" aria-disabled={page === pageCount} className={page === pageCount ? "pointer-events-none opacity-50" : ""} onClick={(event) => { event.preventDefault(); onPageChange(Math.min(pageCount, page + 1)); }} /></PaginationItem></PaginationContent></Pagination>;
}

function Identity({ user }: { user: User }) { const name = user.display_name || user.username; return <div className="flex min-w-0 items-center gap-3"><Avatar className="size-10"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs text-white">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-slate-500">@{user.username}{user.email ? ` • ${user.email}` : ""}</p></div></div>; }
function Status({ status }: { status: UserStatus }) { const style = status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : status === "LOCKED" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{status}</span>; }
function Actions({ user, onEdit, onDelete }: { user: User; onEdit: (user: User) => void; onDelete: (user: User) => void }) { return <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(user)}><HugeiconsIcon icon={PencilEdit02Icon} className="mr-1 size-4" />แก้ไข</Button><Button size="sm" variant="destructive" onClick={() => onDelete(user)}><HugeiconsIcon icon={Delete02Icon} className="mr-1 size-4" />ลบ</Button></div>; }
function EmptyState() { return <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><HugeiconsIcon icon={UserAdd01Icon} className="mb-3 size-8 text-slate-400" /><h3 className="font-semibold">ไม่พบผู้ใช้งาน</h3><p className="mt-1 text-sm text-slate-500">ลองค้นหาด้วยข้อมูลอื่น</p></div>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "ยังไม่เคยเข้าสู่ระบบ"; }
