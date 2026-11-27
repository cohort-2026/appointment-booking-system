import { Link } from "react-router-dom"
import { ArrowRight, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KIND_STYLE, formatRand } from "@/lib/providerKind"
import { cn } from "@/lib/utils"
import type { Provider, ProviderService } from "../../types/providers"

export type ServiceEntry = { service: ProviderService; provider: Provider }

export default function ServiceCard({ service, provider, dashboard = false }: ServiceEntry & { dashboard?: boolean }) {
  const kind = KIND_STYLE[provider.kind]

  return (
    <Card className={cn("group h-full gap-0 overflow-hidden py-0 transition duration-200 hover:shadow-xl hover:shadow-slate-200/60", dashboard ? "rounded-lg sm:flex-row" : "hover:-translate-y-1")}>
      <div className={cn("relative h-20 shrink-0 overflow-hidden bg-linear-to-br", kind.header, dashboard && "sm:h-auto sm:w-44")}>
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20"
        />
        <div className="relative z-10 p-4">
          <Badge className="bg-white/90 text-slate-700">{kind.label}</Badge>
        </div>
      </div>

      <CardContent className="flex min-w-0 flex-1 flex-col px-5 py-5">
        <h3 className="text-lg font-semibold leading-tight">{service.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {provider.name} · {provider.category}
        </p>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {service.description || "Book this service with the provider."}
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {service.duration} min
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold">
            {service.price !== null ? formatRand(service.price) : "Price on request"}
          </p>
          <Button asChild size="lg">
            <Link to={`${dashboard ? "/dashboard/customer/book" : "/providers"}/${encodeURIComponent(provider.id)}`}>
              View service
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}