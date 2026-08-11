import AttachmentShow from "./_components/AttachmentShow";
import { getFilesSnapshot } from "./_lib/files-server";

export default async function FilesPage() {
  await getFilesSnapshot();
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            File Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            จัดการไฟล์
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
            ดูแลไฟล์ทั้งหมดในระบบ เปลี่ยนชื่อ ลบ อัปโหลด
            และกระจายไฟล์ไปยังเครื่องปลายทาง
          </p>
        </div>
      </header>

      <AttachmentShow />
    </div>
  );
}
