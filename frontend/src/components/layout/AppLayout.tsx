import { useEffect, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar, type UserRole } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/services/api"
import {
  BusinessDashboardProvider,
  type BusinessDashboardResponse,
} from "@/context/BusinessDashboardContext"

export function AppLayout({ role }: { role: UserRole }) {
  const location = useLocation()
  const { user } = useAuth()
  const [businessData, setBusinessData] = useState<BusinessDashboardResponse | null>(null)
  const [businessLoading, setBusinessLoading] = useState(role === "owner")
  const [businessError, setBusinessError] = useState<string | null>(null)

  useEffect(() => {
    if (role !== "owner") return

    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusinessLoading(true)
    void apiFetch<BusinessDashboardResponse>("/business/dashboard")
      .then((response) => {
        if (active) setBusinessData(response)
      })
      .catch((reason: unknown) => {
        if (active) setBusinessError(reason instanceof Error ? reason.message : "Business dashboard data could not be loaded.")
      })
      .finally(() => {
        if (active) setBusinessLoading(false)
      })

    return () => {
      active = false
    }
  }, [role])
  const name = user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
  const roleLabel = {
    customer: "Customer",
    owner: "Business owner",
    provider: "Sole provider",
    staff: "Staff",
    admin: "Platform admin",
  }[role]
  const profilePath = {
    customer: "/dashboard/customer/profile",
    owner: "/dashboard/business/profile",
    provider: "/dashboard/provider/profile",
    staff: "/dashboard/staff/profile",
    admin: "/dashboard/admin/profile",
  }[role]

  const breadcrumbs = location.pathname.split("/").filter(Boolean).map((segment) =>
    segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll("-", " ")
  )
  const currentPage = breadcrumbs.at(-1)

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex min-w-0 flex-1 items-center">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm font-medium text-slate-500">
              {breadcrumbs.slice(0, -1).map((label, index) => (
                <span key={index} className="hidden min-w-0 items-center sm:flex">
                  <span className="truncate">{label}</span>
                  <span aria-hidden="true" className="mx-2 shrink-0 text-slate-300">/</span>
                </span>
              ))}
              <span aria-current="page" className="truncate text-slate-900">{currentPage}</span>
            </nav>
          </div>
          <Link
            to={profilePath}
            className="flex shrink-0 items-center gap-3 rounded-full p-1.5 pr-3 transition hover:bg-slate-50"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white">
              {initials || "U"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-sm font-semibold text-slate-900">{name}</span>
              <span className="block text-xs text-slate-500">{roleLabel}</span>
            </span>
          </Link>
        </header>
        {role === "owner" ? (
          <BusinessDashboardProvider
            value={{ data: businessData, loading: businessLoading, error: businessError }}
          >
            <main className="flex flex-1 flex-col gap-6 bg-slate-50/50 p-4 md:p-6 lg:p-8">
              <div className="dashboard-shell-content mx-auto w-full max-w-7xl">
                <Outlet />
              </div>
            </main>
          </BusinessDashboardProvider>
        ) : (
          <main className="flex flex-1 flex-col gap-6 bg-slate-50/50 p-4 md:p-6 lg:p-8">
            <div className="dashboard-shell-content mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
