import AttachmentShow from "./_components/AttachmentShow";
import { getFiles } from "./_lib/files-server";

type FilesPageProps = {
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
};

function positiveInteger(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const query = await searchParams;
  const page = positiveInteger(query.page, 1);
  const limit = Math.min(100, positiveInteger(query.limit, 20));
  const response = await getFiles(page, limit);

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

      <AttachmentShow
        key={`${response.pagination.page}-${response.pagination.limit}-${response.pagination.total}-${response.files.map((file) => file.filename).join(",")}`}
        initialFiles={response.files}
        pagination={response.pagination}
      />
    </div>
  );
}
