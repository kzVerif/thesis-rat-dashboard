import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FileDistributionProvider } from "@/components/file-distribution/file-distribution-provider"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  return (
    <FileDistributionProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 px-3 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 sm:py-3 lg:px-6">
          <SidebarTrigger />
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {children}
        </div>
        </main>
      </SidebarProvider>
    </FileDistributionProvider>
  )
}
