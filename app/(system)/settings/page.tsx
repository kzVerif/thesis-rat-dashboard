import { getAuthSessions, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./_components/SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const sessions = await getAuthSessions();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600">Account & Security</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          ตั้งค่าบัญชี
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ตรวจสอบข้อมูล เปลี่ยนรหัสผ่าน และจัดการอุปกรณ์ที่เข้าสู่ระบบ
        </p>
      </div>
      <SettingsClient initialUser={user} initialSessions={sessions} />
    </div>
  );
}
