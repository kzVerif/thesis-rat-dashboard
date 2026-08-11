import {
  ComputerIcon,
  File02Icon,
  ShutDownIcon,
  SignalFull02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { RecentlyUsedTable } from "./_components/RecentlyUsedTable";
import { getDashboardSnapshot } from "./_lib/dashboard-server";

export default async function DashboardPage() {
  await getDashboardSnapshot();
  return (
    <div className="mx-auto w-full max-w-7xl">

      {/* Headers */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          แดชบอร์ด
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          ยินดีต้อนรับกลับมา
        </p>
      </div>

      {/* Card Stats System */}
      <div className="mb-6 sm:mb-8">

      <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 xl:gap-6">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 sm:size-20 xl:size-16 2xl:size-20">
              <HugeiconsIcon
                icon={ComputerIcon}
                className="size-8 text-white sm:size-10 xl:size-8 2xl:size-10"
              />
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-sm text-gray-500 sm:text-base">ครื่องทั้งหมด</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  100
                </h3>
                <h4>เครื่อง</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white  rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-blue-500/20 sm:size-20 xl:size-16 2xl:size-20">
              <HugeiconsIcon
                icon={SignalFull02Icon}
                className="size-8 text-white sm:size-10 xl:size-8 2xl:size-10"
              />
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-sm text-gray-500 sm:text-base">เครื่องออนไลน์</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  46
                </h3>
                <h4>เครื่อง</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white  rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 shadow-md shadow-blue-500/20 sm:size-20 xl:size-16 2xl:size-20">
              <HugeiconsIcon
                icon={ShutDownIcon}
                className="size-8 text-white sm:size-10 xl:size-8 2xl:size-10"
              />
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-sm text-gray-500 sm:text-base">เครื่องออฟไลน์</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  54
                </h3>
                <h4>เครื่อง</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white  rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 sm:size-20 xl:size-16 2xl:size-20">
              <HugeiconsIcon
                icon={File02Icon}
                className="size-8 text-white sm:size-10 xl:size-8 2xl:size-10"
              />
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-sm text-gray-500 sm:text-base">ไฟล์ในระบบ</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  12
                </h3>
                <h4>ไฟล์</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-end text-sm text-gray-500">
        ข้อมูล ณ {new Date().toLocaleString()}
      </p>
      </div>

      {/* Commands Recently Used */}
      <div>
        <RecentlyUsedTable />
      </div>
      
    </div>
  );
}
