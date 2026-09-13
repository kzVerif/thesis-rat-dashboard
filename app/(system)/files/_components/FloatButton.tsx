"use client";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  FileUploadIcon,
} from "@hugeicons/core-free-icons";
import UploadDialog from "./UploadDialog";

export default function FloatButton({
  onUpload,
}: {
  onUpload: (files: File[]) => Promise<boolean>;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleUploadClick = () => {
    setPopoverOpen(false); // ปิด Popover
    setUploadOpen(true);   // เปิด Upload Dialog
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={`fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl sm:bottom-6 sm:right-6 sm:size-14 ${
              popoverOpen ? "rotate-45" : ""
            }`}
          >
            <HugeiconsIcon icon={Add01Icon} className="w-6 h-6" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="mb-2 w-[calc(100vw-2rem)] max-w-64 p-2"
        >
          <div className="flex flex-col gap-1">
            {/* อัปโหลดไฟล์ - แค่ปุ่มธรรมดา ไม่ใช้ DialogTrigger */}
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <HugeiconsIcon icon={FileUploadIcon} className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  อัปโหลดไฟล์
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ส่งไฟล์ไปยังเครื่องแม่
                </p>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Upload Dialog แยกออกมาข้างนอก Popover */}
      <UploadDialog
        open={uploadOpen}
        setOpen={setUploadOpen}
        onUpload={onUpload}
      />
    </>
  );
}
