import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface QuickLinkCardProps {
  to: string
  icon: string | React.ReactNode
  title: string
  description: string
  className?: string
}

export function QuickLinkCard({ to, icon, title, description, className }: QuickLinkCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-lg text-sky-700 transition-colors group-hover:bg-sky-100"
      >
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <span className="mt-5 inline-block text-sm font-semibold text-sky-700 group-hover:text-sky-800">
        Open page →
      </span>
    </Link>
  )
}