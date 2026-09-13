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
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthUser } from "@/lib/auth";

const menuSections = [
  {
    label: "ภาพรวม",
    items: [
      { title: "แดชบอร์ด", href: "/dashboard", icon: DashboardSquare01Icon },
    ],
  },
  {
    label: "อุปกรณ์และห้อง",
    items: [
      { title: "ห้องเรียน", href: "/rooms", icon: MeetingRoomIcon },
      { title: "Agents", href: "/agents", icon: ComputerUserIcon },
      { title: "ตรวจสอบหน้าจอ", href: "/screens", icon: ComputerScreenShareIcon },
    ],
  },
  {
    label: "ความปลอดภัย",
    items: [
      { title: "สั่ง AV Scan", href: "/av-scans", icon: SecurityCheckIcon },
      { title: "ติดตามผลสแกน", href: "/av-scans/results", icon: ComputerActivityIcon },
    ],
  },
  {
    label: "จัดการไฟล์",
    items: [
      { title: "ไฟล์ในระบบ", href: "/files", icon: AttachmentIcon },
      { title: "กระจายไฟล์", href: "/distribute-files", icon: FileExportIcon },
      { title: "ติดตามการกระจาย", href: "/file-distributions", icon: ComputerActivityIcon },
    ],
  },
  {
    label: "ผู้ดูแลระบบ",
    items: [
      { title: "ผู้ใช้งาน", href: "/users", icon: UserSettings01Icon },
      { title: "บทบาทและสิทธิ์", href: "/permissions", icon: SecurityCheckIcon },
      { title: "Tokens", href: "/tokens", icon: Key01Icon },
      { title: "Audit Logs", href: "/auditlogs", icon: Setting07Icon },
    ],
  },
] as const;

export function AppSidebar({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();

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
      <SidebarHeader className="border-b border-sidebar-border px-3">
        <div className="flex h-16 items-center justify-start">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
              <HugeiconsIcon
                icon={ComputerActivityIcon}
                className="w-5 h-5 text-white"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-base font-bold">RAT System</h1>
              <p className="truncate text-xs text-muted-foreground">Remote Administration</p>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        {menuSections.map((section) => (
          <SidebarGroup key={section.label} className="py-2">
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/av-scans" && pathname.startsWith(`${item.href}/`));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-10 rounded-lg px-3 text-sm font-medium">
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <HugeiconsIcon icon={item.icon} className="!size-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              <Avatar className="size-9 border-2 border-blue-500/20">
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
              <HugeiconsIcon icon={ChevronUpIcon} className="size-4 shrink-0 text-muted-foreground" />
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
