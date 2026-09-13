"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ComputerIcon,
  FileExportIcon,
  MeetingRoomIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import type { DistributionSnapshot } from "../_lib/types";
import { useFileDistribution } from "@/components/file-distribution/file-distribution-provider";

type TargetType = "computer" | "room";

export default function DistributeFilesClient({
  snapshot,
}: {
  snapshot: DistributionSnapshot;
}) {
  const { files, computers, rooms } = snapshot;
  const { connection, distribute } = useFileDistribution();
  const targetOptions = useMemo(
    () => ({ computer: computers, room: rooms }),
    [computers, rooms],
  );
  const [selectedFileId, setSelectedFileId] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("computer");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [query, setQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return files;
    return files.filter((file) =>
      file.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [files, query]);

  const selectedFile = files.find((file) => file.id === selectedFileId);
  const selectedTarget = targetOptions[targetType].find(
    (target) => target.id === selectedTargetId
  );
  const visibleTargets = useMemo(() => {
    const normalizedQuery = targetQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return targetOptions[targetType];
    return targetOptions[targetType].filter(
      (target) =>
        target.name.toLocaleLowerCase().includes(normalizedQuery) ||
        target.description.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [targetOptions, targetQuery, targetType]);

  const handleTargetTypeChange = (type: TargetType) => {
    setTargetType(type);
    setSelectedTargetId("");
    setTargetQuery("");
    setSubmitted(false);
  };

  const handleOpenConfirmation = () => {
    if (!selectedFile || !selectedTarget) return;
    setConfirmOpen(true);
  };

  const handleConfirmDistribute = () => {
    if (!selectedFile || !selectedTarget) return;
    const targetedComputers = targetType === "computer"
      ? computers.filter((computer) => computer.id === selectedTarget.id)
      : computers.filter((computer) => computer.roomId === selectedTarget.id);
    try {
      distribute({
        fileId: selectedFile.id,
        filename: selectedFile.name,
        fileSize: selectedFile.sizeBytes,
        targetLabel: selectedTarget.name,
        target: targetType === "computer"
          ? { type: "AGENTS", agent_ids: [selectedTarget.id] }
          : { type: "ROOM", room_id: selectedTarget.id },
        computers: targetedComputers.map((computer) => ({
          id: computer.id,
          hostname: computer.name,
          ipAddress: computer.ipAddress,
          status: computer.status,
        })),
      });
    } catch (error) {
      toast.error("ยังไม่สามารถกระจายไฟล์ได้", {
        description: error instanceof Error ? error.message : "WebSocket ยังไม่ได้เชื่อมต่อ",
      });
      return;
    }
    setConfirmOpen(false);
    setSubmitted(true);
    toast.info("ส่งคำขอกระจายไฟล์แล้ว", { description: "กำลังรอ Backend สร้าง Distribution Job" });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <header className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          File Distribution
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          กระจายไฟล์
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          เลือกไฟล์หนึ่งรายการ จากนั้นเลือกเครื่องหรือห้องปลายทางเพื่อเริ่มกระจายไฟล์
        </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionBadge state={connection} />
          <Button asChild variant="outline" className="h-9">
            <Link href="/file-distributions">ดูงานทั้งหมด</Link>
          </Button>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
            <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <StepLabel number={1} />
                  <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    เลือกไฟล์
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    เลือกได้ครั้งละหนึ่งไฟล์เท่านั้น
                  </p>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                  <span className="sr-only">ค้นหาไฟล์</span>
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาไฟล์..."
                    className="h-10 pl-9 sm:h-9"
                  />
                </label>
              </div>
            </div>

            <div className="max-h-[min(420px,45dvh)] divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-slate-800">
              {visibleFiles.map((file) => {
                const isSelected = selectedFileId === file.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setSubmitted(false);
                    }}
                    className={`flex min-h-16 w-full items-center gap-3 p-3 text-left transition-colors sm:min-h-20 sm:gap-4 sm:p-5 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900 sm:size-12">
                      <Image
                        src="/files/file_icons.webp"
                        width={34}
                        height={34}
                        alt=""
                        className="size-8 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {file.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {file.type} • {file.size}
                      </span>
                    </span>
                    <SelectionDot selected={isSelected} />
                  </button>
                );
              })}
              {visibleFiles.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  ไม่พบไฟล์ที่ค้นหา
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5">
            <StepLabel number={2} />
            <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              เลือกประเภทปลายทาง
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              ส่งไปยังเครื่องเดียว หรือส่งไปยังทุกเครื่องภายในห้อง
            </p>

            <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2">
              <TargetTypeButton
                active={targetType === "computer"}
                icon={ComputerIcon}
                title="เลือกเครื่อง"
                description="กระจายไฟล์ไปยังเครื่องที่ระบุ"
                onClick={() => handleTargetTypeChange("computer")}
              />
              <TargetTypeButton
                active={targetType === "room"}
                icon={MeetingRoomIcon}
                title="เลือกห้อง"
                description="กระจายไฟล์ไปยังทุกเครื่องในห้อง"
                onClick={() => handleTargetTypeChange("room")}
              />
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <StepLabel number={3} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    เลือก{targetType === "computer" ? "เครื่อง" : "ห้อง"}ปลายทาง
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {targetOptions[targetType].length} รายการ
                  </span>
                </div>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <span className="sr-only">
                  ค้นหา{targetType === "computer" ? "เครื่อง" : "ห้อง"}
                </span>
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={targetQuery}
                  onChange={(event) => setTargetQuery(event.target.value)}
                  placeholder={`ค้นหา${targetType === "computer" ? "เครื่อง" : "ห้อง"}...`}
                  className="h-10 pl-9 sm:h-9"
                />
              </label>
            </div>

            <div className="mt-4 max-h-[min(460px,50dvh)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 p-2 dark:border-slate-800 sm:p-3">
              <div className="grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3">
              {visibleTargets.map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => {
                      setSelectedTargetId(target.id);
                      setSubmitted(false);
                    }}
                    className={`flex min-h-16 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <HugeiconsIcon
                        icon={targetType === "computer" ? ComputerIcon : MeetingRoomIcon}
                        className="size-5"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {target.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {target.description}
                      </span>
                    </span>
                    <SelectionDot selected={isSelected} />
                  </button>
                );
              })}
              </div>
              {visibleTargets.length === 0 && (
                <div className="flex min-h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                  ไม่พบ{targetType === "computer" ? "เครื่อง" : "ห้อง"}ที่ค้นหา
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              แสดง {visibleTargets.length} จาก {targetOptions[targetType].length} รายการ
            </p>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              สรุปการกระจายไฟล์
            </h2>
            <div className="mt-5 space-y-4">
              <SummaryRow
                label="ไฟล์"
                value={selectedFile?.name || "ยังไม่ได้เลือก"}
              />
              <SummaryRow
                label="ประเภทปลายทาง"
                value={targetType === "computer" ? "เครื่อง" : "ห้อง"}
              />
              <SummaryRow
                label="ปลายทาง"
                value={selectedTarget?.name || "ยังไม่ได้เลือก"}
              />
            </div>

            {submitted && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                ส่งคำขอแล้ว ติดตามสถานะได้ที่หน้างานกระจายไฟล์
              </div>
            )}

            <Button
              type="button"
              size="lg"
              disabled={!selectedFile || !selectedTarget || connection !== "live"}
              onClick={handleOpenConfirmation}
              className="mt-5 h-11 w-full bg-blue-600 text-sm text-white hover:bg-blue-700"
            >
              <HugeiconsIcon icon={FileExportIcon} className="mr-2 size-5" />
              กระจายไฟล์
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              กรุณาตรวจสอบไฟล์และปลายทางก่อนเริ่มดำเนินการ
            </p>
          </div>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 font-kanit sm:max-w-lg sm:p-6">
          <DialogHeader className="pr-7">
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <HugeiconsIcon icon={FileExportIcon} className="size-6" />
            </div>
            <DialogTitle>ยืนยันการกระจายไฟล์</DialogTitle>
            <DialogDescription>
              กรุณาตรวจสอบรายละเอียดให้ถูกต้องก่อนเริ่มกระจายไฟล์
            </DialogDescription>
          </DialogHeader>

          {selectedFile && selectedTarget && (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40 sm:p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
                  <Image
                    src="/files/file_icons.webp"
                    width={32}
                    height={32}
                    alt=""
                    className="size-8 object-contain"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedFile.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {selectedFile.type} • {selectedFile.size}
                  </span>
                </span>
              </div>

              <dl className="divide-y divide-slate-100 px-3 dark:divide-slate-800 sm:px-4">
                <ConfirmationRow
                  label="ไฟล์"
                  value={selectedFile.name}
                />
                <ConfirmationRow
                  label="ประเภทไฟล์"
                  value={selectedFile.type}
                />
                <ConfirmationRow
                  label="ประเภทปลายทาง"
                  value={targetType === "computer" ? "เครื่อง" : "ห้อง"}
                />
                <ConfirmationRow
                  label={targetType === "computer" ? "เครื่องปลายทาง" : "ห้องปลายทาง"}
                  value={selectedTarget.name}
                />
                <ConfirmationRow
                  label="รายละเอียดปลายทาง"
                  value={selectedTarget.description}
                />
              </dl>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-10 w-full sm:w-auto"
            >
              กลับไปแก้ไข
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDistribute}
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
            >
              <HugeiconsIcon icon={FileExportIcon} className="mr-1.5 size-4" />
              ยืนยันกระจายไฟล์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepLabel({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
      <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white">
        {number}
      </span>
      ขั้นตอนที่ {number}
    </span>
  );
}

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`size-4 shrink-0 rounded-full border-4 ${
        selected
          ? "border-blue-600 bg-white"
          : "border-slate-300 dark:border-slate-600"
      }`}
    />
  );
}

function TargetTypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof ComputerIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:p-4 ${
        active
          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/30"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400 sm:size-11">
        <HugeiconsIcon icon={icon} className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900 dark:text-white">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ConfirmationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-900 dark:text-white sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function ConnectionBadge({ state }: { state: "connecting" | "live" | "reconnecting" | "disconnected" }) {
  const labels = { connecting: "Connecting...", live: "Live", reconnecting: "Reconnecting...", disconnected: "Disconnected" };
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <span className={`size-2 rounded-full ${state === "live" ? "animate-pulse bg-emerald-500" : state === "disconnected" ? "bg-red-500" : "bg-amber-500"}`} />
      {labels[state]}
    </span>
  );
}
