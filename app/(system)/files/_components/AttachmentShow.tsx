"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileEmpty02Icon, FileUploadIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FileMutationResponse, FilesPagination, SystemFile } from "../_lib/types";
import DeleteFileDialog from "./DeleteFileDialog";
import FloatButton from "./FloatButton";
import RenameFileDialog from "./RenameFileDialog";

type Props = {
  initialFiles: SystemFile[];
  pagination: FilesPagination;
};

export default function AttachmentShow({ initialFiles, pagination }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [total, setTotal] = useState(pagination.total);
  const [query, setQuery] = useState("");

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return files;
    return files.filter((file) =>
      [file.filename, file.original_name, file.content_type, file.extension]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    );
  }, [files, query]);

  async function handleRename(filename: string, newName: string) {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const { file } = await readJson<FileMutationResponse>(response);
      setFiles((current) => current.map((item) => item.id === file.id ? file : item));
      router.refresh();
      toast.success("เปลี่ยนชื่อไฟล์เรียบร้อยแล้ว");
      return true;
    } catch (error) {
      toast.error("ไม่สามารถเปลี่ยนชื่อไฟล์ได้", { description: getErrorMessage(error) });
      return false;
    }
  }

  async function handleDelete(filename: string) {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (!response.ok) await throwApiError(response);
      setFiles((current) => current.filter((file) => file.filename !== filename));
      setTotal((current) => Math.max(0, current - 1));
      router.refresh();
      toast.success("ลบไฟล์เรียบร้อยแล้ว");
      return true;
    } catch (error) {
      toast.error("ไม่สามารถลบไฟล์ได้", { description: getErrorMessage(error) });
      return false;
    }
  }

  async function handleUpload(selectedFiles: File[]) {
    const oversized = selectedFiles.find((file) => file.size > 100 * 1024 * 1024);
    if (oversized) {
      toast.error("ไฟล์มีขนาดเกิน 100 MiB", { description: oversized.name });
      return false;
    }

    const uploaded: SystemFile[] = [];
    try {
      for (const selectedFile of selectedFiles) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const response = await fetch("/api/files/upload", { method: "POST", body: formData });
        const { file } = await readJson<FileMutationResponse>(response);
        uploaded.push(file);
      }

      if (pagination.page === 1) {
        setFiles((current) => [...uploaded.reverse(), ...current].slice(0, pagination.limit));
      }
      setTotal((current) => current + uploaded.length);
      router.refresh();
      toast.success(`อัปโหลดสำเร็จ ${uploaded.length} ไฟล์`);
      return true;
    } catch (error) {
      if (uploaded.length > 0) {
        setTotal((current) => current + uploaded.length);
        router.refresh();
      }
      toast.error("อัปโหลดไฟล์ไม่ครบ", {
        description: `${uploaded.length} ไฟล์สำเร็จ — ${getErrorMessage(error)}`,
      });
      return false;
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">ไฟล์ในระบบ</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {total} ไฟล์
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                รายการไฟล์และ metadata จากระบบหลังบ้าน
              </p>
            </div>

            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">ค้นหาไฟล์ในหน้านี้</span>
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาไฟล์ในหน้านี้..." className="h-10 pl-9" />
            </label>
          </div>
        </div>

        {visibleFiles.length === 0 ? <Empty hasQuery={Boolean(query.trim())} /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleFiles.map((file) => (
              <article key={file.id} className="group p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 sm:p-5">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 sm:size-14">
                    <Image src="/files/file_icons.webp" width={40} height={40} alt="" className="size-8 object-contain sm:size-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base" title={file.filename}>
                      {displayName(file.filename)}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{file.extension.replace(/^\./, "").toUpperCase() || "FILE"}</span>
                      <span aria-hidden="true">•</span><span>{formatFileSize(file.file_size)}</span>
                      <span aria-hidden="true" className="hidden sm:inline">•</span>
                      <span className="basis-full sm:basis-auto">อัปโหลด {formatDate(file.created_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400" title={file.original_name}>ชื่อเดิม: {file.original_name}</p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <RenameFileDialog key={file.filename} currentName={displayName(file.filename)} onRename={(name) => handleRename(file.filename, name)} />
                    <DeleteFileDialog fileName={displayName(file.filename)} onDelete={() => handleDelete(file.filename)} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
                  <RenameFileDialog key={file.filename} currentName={displayName(file.filename)} onRename={(name) => handleRename(file.filename, name)} />
                  <DeleteFileDialog fileName={displayName(file.filename)} onDelete={() => handleDelete(file.filename)} />
                </div>
              </article>
            ))}
          </div>
        )}

        <PaginationFooter pagination={{ ...pagination, total }} visibleCount={visibleFiles.length} />
      </section>
      <FloatButton onUpload={handleUpload} />
    </>
  );
}

function Empty({ hasQuery }: { hasQuery: boolean }) {
  return <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
      <HugeiconsIcon icon={FileEmpty02Icon} className="size-7 text-slate-400" />
    </div>
    <h3 className="font-semibold text-slate-900 dark:text-white">ไม่พบไฟล์</h3>
    <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
      {hasQuery ? "ลองค้นหาด้วยชื่อหรือชนิดไฟล์อื่น" : "ยังไม่มีไฟล์ในระบบ อัปโหลดไฟล์เพื่อเริ่มต้นใช้งาน"}
    </p>
  </div>;
}

function PaginationFooter({ pagination, visibleCount }: { pagination: FilesPagination; visibleCount: number }) {
  const totalPages = pagination.total === 0 ? 0 : Math.ceil(pagination.total / pagination.limit);
  const firstItem = visibleCount === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = visibleCount === 0 ? 0 : firstItem + visibleCount - 1;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    return start + index;
  });
  const href = (page: number) => `/files?page=${page}&limit=${pagination.limit}`;

  return <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex flex-wrap items-center gap-3">
      <span>{visibleCount === 0 ? "ไม่พบรายการในหน้านี้" : `แสดง ${firstItem}–${lastItem} จาก ${pagination.total} ไฟล์`}</span>
      <form action="/files" method="get" className="flex items-center gap-2">
        <input type="hidden" name="page" value="1" />
        <Label htmlFor="files-limit" className="text-xs font-normal">รายการต่อหน้า</Label>
        <select id="files-limit" name="limit" defaultValue={pagination.limit} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-slate-700 dark:text-slate-300">
          {[10, 20, 50, 100].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
        </select>
      </form>
      <span className="inline-flex items-center gap-1.5 text-xs"><HugeiconsIcon icon={FileUploadIcon} className="size-4" />รองรับหลายไฟล์</span>
    </div>
    {totalPages > 1 && <nav aria-label="แบ่งหน้ารายการไฟล์" className="flex items-center gap-1">
      <Button asChild size="sm" variant="outline" className="h-8" disabled={pagination.page <= 1}><Link aria-disabled={pagination.page <= 1} tabIndex={pagination.page <= 1 ? -1 : undefined} href={pagination.page <= 1 ? href(1) : href(pagination.page - 1)}>ก่อนหน้า</Link></Button>
      {pages.map((page) => <Button key={page} asChild size="sm" variant={page === pagination.page ? "default" : "outline"} className="size-8 p-0"><Link href={href(page)} aria-current={page === pagination.page ? "page" : undefined}>{page}</Link></Button>)}
      <Button asChild size="sm" variant="outline" className="h-8" disabled={pagination.page >= totalPages}><Link aria-disabled={pagination.page >= totalPages} tabIndex={pagination.page >= totalPages ? -1 : undefined} href={pagination.page >= totalPages ? href(Math.max(1, totalPages)) : href(pagination.page + 1)}>ถัดไป</Link></Button>
    </nav>}
  </footer>;
}

function displayName(filename: string) {
  return filename.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[^.]+$|$)/i, "");
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function throwApiError(response: Response): Promise<never> {
  const payload: unknown = await response.json().catch(() => null);
  const message = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null;
  throw new Error(typeof message === "string" ? message : `HTTP ${response.status}`);
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) return throwApiError(response);
  return response.json() as Promise<T>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาดจากระบบหลังบ้าน";
}
