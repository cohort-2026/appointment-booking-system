import * as React from "react"
import { Calendar, CreditCard, Home, Settings, Users, Scissors, DollarSign, ShieldCheck, Clock, LogOut } from "lucide-react"
import { NavMain } from "./nav-main"
import { TeamSwitcher } from "./team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export type UserRole = "customer" | "owner" | "staff" | "provider" | "admin"

const getNavItems = (role: UserRole) => {
  const common = [
    { title: "Dashboard", url: `/dashboard/${role === "owner" ? "business" : role}`, icon: <Home /> },
    { title: "Appointments", url: `/dashboard/${role === "owner" ? "business" : role}/appointments`, icon: <Calendar /> },
  ]

  switch (role) {
    case "customer":
      return [
        ...common,
        { title: "Book a Service", url: "/dashboard/customer/book", icon: <Scissors /> },
        { title: "My Profile", url: "/dashboard/customer/profile", icon: <Users /> },
      ]
    case "staff":
      return [
        { title: "My Day", url: "/dashboard/staff", icon: <Calendar /> },
        { title: "Appointments", url: "/dashboard/staff/appointments", icon: <Calendar /> },
        { title: "My Schedule", url: "/dashboard/staff/availability", icon: <Clock /> },
        { title: "My Profile", url: "/dashboard/staff/profile", icon: <Users /> },
      ]
    case "owner":
      return [
        { title: "Overview", url: "/dashboard/business", icon: <Home /> },
        { title: "Appointments", url: "/dashboard/business/appointments", icon: <Calendar /> },
        { title: "Team", url: "/dashboard/business/staff", icon: <Users /> },
        { title: "Services", url: "/dashboard/business/services", icon: <Scissors /> },
        { title: "Analytics", url: "/dashboard/business/analytics", icon: <DollarSign /> },
        { title: "Subscription", url: "/dashboard/business/package", icon: <CreditCard /> },
        { title: "Settings", url: "/dashboard/business/profile", icon: <Settings /> },
      ]
    case "provider":
      return [
        ...common,
        { title: "My Services", url: "/dashboard/provider/services", icon: <Scissors /> },
        { title: "My Availability", url: "/dashboard/provider/availability", icon: <Clock /> },
        { title: "My Profile", url: "/dashboard/provider/profile", icon: <Users /> },
        { title: "Subscription", url: "/dashboard/provider/subscription", icon: <CreditCard /> },
      ]
    case "admin":
      return [
        { title: "Platform Overview", url: "/dashboard/admin", icon: <ShieldCheck /> },
        { title: "My Profile", url: "/dashboard/admin/profile", icon: <Settings /> },
      ]
  }
}

const navigationLabels: Record<UserRole, string> = {
  customer: "Customer dashboard",
  owner: "Business dashboard",
  staff: "Staff dashboard",
  provider: "Provider dashboard",
  admin: "Admin dashboard",
}

export function AppSidebar({ role, ...props }: React.ComponentProps<typeof Sidebar> & { role: UserRole }) {
  const { logout } = useAuth();
  const teams = [{
    name: role === "admin" ? "ITThynkAppoint" : role === "provider" ? "Provider Console" : role === "staff" ? "Staff Workspace" : role === "owner" ? "Business Console" : "Customer Account",
    logo: role === "admin" ? <ShieldCheck /> : role === "customer" ? <Users /> : <Scissors />,
    plan: role === "admin" ? "Platform" : role === "owner" ? "Business" : "Workspace",
  }]

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-800 bg-[#0B1220] text-slate-300" {...props}>
      <SidebarHeader className="border-b border-slate-800/50 px-3 py-4"><TeamSwitcher teams={teams} /></SidebarHeader>
      <SidebarContent>
        <nav aria-label={navigationLabels[role]}>
          <NavMain items={getNavItems(role)} />
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-800/50 p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void logout()}
          className="w-full justify-start gap-3 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
