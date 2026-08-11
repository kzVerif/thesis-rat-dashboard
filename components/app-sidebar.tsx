"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  AttachmentIcon,
  FileExportIcon,
  ComputerActivityIcon,
  ComputerUserIcon,
  ComputerScreenShareIcon,
  DashboardSquare01Icon,
  MeetingRoomIcon,
  UserSettings01Icon,
  Setting07Icon,
  Logout01Icon,
  ChevronUpIcon,
  Key01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthUser } from "@/lib/auth";

export function AppSidebar({ user }: { user: AuthUser }) {
  const router = useRouter();

  async function logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      toast.error("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    router.replace("/");
    router.refresh();
  }
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-start h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
              <HugeiconsIcon
                icon={ComputerActivityIcon}
                className="w-5 h-5 text-white"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold">RAT System</h1>
              <h2 className="text-sm text-muted-foreground">Remote Control</h2>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider">
            เมนูหลัก
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild >
                  <Link href="/dashboard" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={DashboardSquare01Icon}
                      className="!w-5 !h-5"
                    />
                    <span>แดชบอร์ด</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/rooms" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={MeetingRoomIcon}
                      className="!w-5 !h-5"
                    />
                    <span>จัดการห้องเรียน</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/files" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={AttachmentIcon}
                      className="!w-5 !h-5"
                    />
                    <span>จัดการไฟล์</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/agents" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={ComputerUserIcon}
                      className="!w-5 !h-5"
                    />
                    <span>จัดการ Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/screens" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={ComputerScreenShareIcon}
                      className="!w-5 !h-5"
                    />
                    <span>ตรวจสอบหน้าจอ</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/distribute-files" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={FileExportIcon}
                      className="!w-5 !h-5"
                    />
                    <span>กระจายไฟล์</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/users" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon
                      icon={UserSettings01Icon}
                      className="!w-5 !h-5"
                    />
                    <span>จัดการผู้ใช้</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/tokens" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon icon={Key01Icon} className="!w-5 !h-5" />
                    <span>จัดการ Tokens</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/permissions" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon icon={SecurityCheckIcon} className="!w-5 !h-5" />
                    <span>บทบาทและสิทธิ์</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/auditlogs" className="text-[15px] font-medium py-5">
                    <HugeiconsIcon icon={Setting07Icon} className="!w-5 !h-5" />
                    <span>ตรวจสอบ Logs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Avatar className="w-10 h-10 border-2 border-blue-500/20">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start leading-tight min-w-0 flex-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user.display_name || user.username}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </span>
              </div>
              <HugeiconsIcon icon={ChevronUpIcon} />{" "}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings">
                <HugeiconsIcon icon={Setting07Icon} className="w-4 h-4 mr-2" />
                <span>ตั้งค่า</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="cursor-pointer text-red-600 dark:text-red-400">
              <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4 mr-2" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
