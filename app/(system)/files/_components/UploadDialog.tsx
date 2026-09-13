"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useRef } from "react";

type UploadDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onUpload: (files: File[]) => Promise<boolean>;
};

export default function UploadDialog({
  open,
  setOpen,
  onUpload,
}: UploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    const uploaded = await onUpload(selectedFiles);
    setIsUploading(false);
    if (!uploaded) return;
    setOpen(false);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files ?? []));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50">
              <HugeiconsIcon
                icon={FileUploadIcon}
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            อัปโหลดไฟล์
          </DialogTitle>
          <DialogDescription>
            เลือกไฟล์หนึ่งรายการหรือหลายรายการเพื่อเพิ่มเข้าสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <Label htmlFor="file">ไฟล์</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="file"
                type="text"
                placeholder="ยังไม่ได้เลือกไฟล์"
                value={
                  selectedFiles.length > 0
                    ? selectedFiles.length === 1
                      ? selectedFiles[0].name
                      : `เลือกแล้ว ${selectedFiles.length} ไฟล์`
                    : ""
                }
                readOnly
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                เลือกไฟล์
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <HugeiconsIcon icon={FileUploadIcon} className="w-4 h-4 mr-2" />
            {isUploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
            {selectedFiles.length > 0 ? ` ${selectedFiles.length} ไฟล์` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
