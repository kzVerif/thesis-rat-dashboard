export function DistributionProgress({ value, label = "ความคืบหน้าการดาวน์โหลด" }: { value: number; label?: string }) {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalized)}>
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${normalized}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-medium tabular-nums">{Math.round(normalized)}%</span>
    </div>
  );
}
