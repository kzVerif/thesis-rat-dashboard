import PermissionsManagement from "./_components/PermissionsManagement";
import { getPermissions, getRoles } from "./_lib/rbac-server";
import type { Permission, Role } from "./_lib/types";

export default async function PermissionsPage() {
  let loadError: string | null = null;
  let roles: Role[] = [];
  let permissions: Permission[] = [];
  try {
    [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลบทบาทและสิทธิ์ได้";
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600">Access control</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          บทบาทและสิทธิ์การใช้งาน
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          สร้างบทบาทและกำหนดขอบเขตการเข้าถึงส่วนต่าง ๆ ของระบบ
        </p>
      </div>
      <PermissionsManagement initialRoles={roles} permissions={permissions} loadError={loadError} />
    </div>
  );
}
