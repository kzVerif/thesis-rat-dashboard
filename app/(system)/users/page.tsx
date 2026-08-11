import UserContent from "./_components/UserContent";
import { getUserRoles, getUsers } from "./_lib/users-server";

export default async function UsersPage() {
  const [users, roles] = await Promise.all([getUsers(), getUserRoles()]);
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          User Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          จัดการผู้ใช้งาน
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          เพิ่ม แก้ไข และดูแลบัญชีผู้ใช้งานที่สามารถเข้าถึงระบบ
        </p>
      </header>

      <UserContent initialUsers={users} roles={roles} />
    </div>
  );
}
