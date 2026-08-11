"use client";

import { FormEvent, useState } from "react";
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
import { Label } from "@/components/ui/label";
import type { RoleOption, User, UserStatus } from "../_lib/types";

export type UserFormValues = Record<
  "username" | "email" | "display_name" | "role_id" | "status" | "password",
  string
>;

export default function UserFormDialog({
  open,
  onOpenChange,
  title,
  user,
  roles,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  user?: User;
  roles: RoleOption[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<UserFormValues>({
    username: user?.username ?? "",
    email: user?.email ?? "",
    display_name: user?.display_name ?? "",
    role_id: user?.role_id ?? roles[0]?.id ?? "",
    status: user?.status ?? "ACTIVE",
    password: "",
  });
  const [pending, setPending] = useState(false);
  function change(field: keyof UserFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await onSubmit(values);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto font-kanit sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลที่จำเป็นสำหรับบัญชีผู้ใช้งาน
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="ชื่อผู้ใช้" required>
            <Input
              value={values.username}
              onChange={(e) => change("username", e.target.value)}
              maxLength={50}
              required
            />
          </Field>
          <Field label="ชื่อที่แสดง">
            <Input
              value={values.display_name}
              onChange={(e) => change("display_name", e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="อีเมล">
            <Input
              type="email"
              value={values.email}
              onChange={(e) => change("email", e.target.value)}
              maxLength={255}
            />
          </Field>
          <Field label="Role" hint={roles.length ? "เลือกรายการ Role จากระบบ" : "ไม่พบ Role ที่สามารถเลือกได้"} required>
            <select
              value={values.role_id}
              onChange={(e) => change("role_id", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              required
              disabled={!roles.length}
            >
              {!roles.length && <option value="">ไม่มี Role</option>}
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}{role.description ? ` — ${role.description}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="สถานะ" required>
            <select
              value={values.status}
              onChange={(e) => change("status", e.target.value as UserStatus)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </Field>
          <Field
            label={user ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
            hint={
              user ? "เว้นว่างเพื่อใช้รหัสผ่านเดิม" : "อย่างน้อย 8 ตัวอักษร"
            }
            required={!user}
          >
            <Input
              type="password"
              value={values.password}
              onChange={(e) => change("password", e.target.value)}
              minLength={values.password ? 8 : undefined}
              required={!user}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending || !roles.length}>
              {pending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
