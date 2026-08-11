"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  FileEmpty02Icon,
  FileUploadIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import DeleteFileDialog from "./DeleteFileDialog";
import FloatButton from "./FloatButton";
import RenameFileDialog from "./RenameFileDialog";

type SystemFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
};

const initialFiles: SystemFile[] = [
  { id: "file-1", name: "workspace.png", type: "PNG", size: "820 KB", uploadedAt: "29 ก.ค. 2569, 10:24" },
  { id: "file-2", name: "คู่มือการใช้งาน.pdf", type: "PDF", size: "4.2 MB", uploadedAt: "29 ก.ค. 2569, 09:10" },
  { id: "file-3", name: "setup-client.exe", type: "EXE", size: "18.6 MB", uploadedAt: "28 ก.ค. 2569, 16:45" },
  { id: "file-4", name: "รายชื่อนักเรียน.xlsx", type: "XLSX", size: "236 KB", uploadedAt: "28 ก.ค. 2569, 13:20" },
  { id: "file-5", name: "lesson-assets.zip", type: "ZIP", size: "52.1 MB", uploadedAt: "27 ก.ค. 2569, 15:05" },
  { id: "file-6", name: "ประกาศห้องเรียน.docx", type: "DOCX", size: "96 KB", uploadedAt: "27 ก.ค. 2569, 11:30" },
  { id: "file-7", name: "presentation-week-04.pptx", type: "PPTX", size: "8.4 MB", uploadedAt: "26 ก.ค. 2569, 14:12" },
  { id: "file-8", name: "classroom-wallpaper.jpg", type: "JPG", size: "1.8 MB", uploadedAt: "26 ก.ค. 2569, 09:42" },
];

export default function AttachmentShow() {
  const [files, setFiles] = useState(initialFiles);
  const [query, setQuery] = useState("");

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return files;
    return files.filter((file) =>
      file.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [files, query]);

  const handleRename = (id: string, newName: string) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === id ? { ...file, name: newName } : file
      )
    );
  };

  const handleDelete = (id: string) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
  };

  const handleUpload = (uploadedFiles: File[]) => {
    const uploadedAt = new Date().toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    setFiles((currentFiles) => [
      ...uploadedFiles.map((file, index) => ({
        id: `uploaded-${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "FILE",
        size: formatFileSize(file.size),
        uploadedAt,
      })),
      ...currentFiles,
    ]);
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  ไฟล์ในระบบ
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {files.length} ไฟล์
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                รายการไฟล์ที่พร้อมจัดการและส่งไปยังเครื่องปลายทาง
              </p>
            </div>

            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">ค้นหาไฟล์</span>
              <HugeiconsIcon
                icon={Search01Icon}
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาจากชื่อไฟล์..."
                className="h-10 pl-9"
              />
            </label>
          </div>
        </div>

        {visibleFiles.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <HugeiconsIcon
                icon={FileEmpty02Icon}
                className="size-7 text-slate-400"
              />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              ไม่พบไฟล์
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              ลองค้นหาด้วยชื่ออื่น หรืออัปโหลดไฟล์ใหม่เข้าสู่ระบบ
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleFiles.map((file) => (
              <article
                key={file.id}
                className="group p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 sm:size-14">
                    <Image
                      src="/files/file_icons.webp"
                      width={40}
                      height={40}
                      alt=""
                      className="size-8 object-contain sm:size-9"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {file.type}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{file.size}</span>
                      <span aria-hidden="true" className="hidden sm:inline">•</span>
                      <span className="basis-full sm:basis-auto">
                        อัปโหลด {file.uploadedAt}
                      </span>
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <RenameFileDialog
                      currentName={file.name}
                      onRename={(newName) => handleRename(file.id, newName)}
                    />
                    <DeleteFileDialog
                      fileName={file.name}
                      onDelete={() => handleDelete(file.id)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
                  <RenameFileDialog
                    currentName={file.name}
                    onRename={(newName) => handleRename(file.id, newName)}
                  />
                  <DeleteFileDialog
                    fileName={file.name}
                    onDelete={() => handleDelete(file.id)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            แสดง {visibleFiles.length} จาก {files.length} รายการ
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={FileUploadIcon} className="size-4" />
              รองรับหลายไฟล์
            </span>
          </div>
        </footer>
      </section>

      <FloatButton onUpload={handleUpload} />
    </>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
