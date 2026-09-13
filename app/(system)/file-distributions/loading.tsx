import { Skeleton } from "@/components/ui/skeleton";

export default function FileDistributionsLoading() {
  return <div className="mx-auto w-full max-w-7xl space-y-5" aria-label="กำลังโหลดงานกระจายไฟล์"><div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-5 w-96 max-w-full" /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div><Skeleton className="h-[420px] rounded-2xl" /></div>;
}
