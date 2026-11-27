import { Link } from "react-router-dom"
import { ArrowRight, Clock, MapPin } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Provider } from "../../types/providers"
import { KIND_STYLE, formatRand } from "@/lib/providerKind"



function lowestPrice(provider: Provider) {
  const prices = provider.services.flatMap((service) =>
    service.bookable !== false && service.price !== null ? [service.price] : [],
  )
  return prices.length > 0 ? Math.min(...prices) : null
}

export default function ProviderCard({ provider, dashboard = false }: { provider: Provider; dashboard?: boolean }) {
  const kind = KIND_STYLE[provider.kind]
  const isOpen = provider.status === "Open"
  const price = lowestPrice(provider)

  return (
    <Card className={cn("group h-full gap-0 overflow-hidden py-0 transition duration-200 hover:shadow-xl hover:shadow-slate-200/60", dashboard ? "rounded-lg sm:flex-row" : "hover:-translate-y-1")}>
      {/* Coloured header */}
      <div className={cn("relative h-28 shrink-0 overflow-hidden bg-linear-to-br", kind.header, dashboard && "sm:h-auto sm:w-44")}>
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-10 size-36 rounded-full bg-white/20"
        />
        <span
          aria-hidden="true"
          className="absolute right-16 top-14 size-10 rounded-full bg-white/10"
        />
        <div className="relative z-10 flex items-start justify-between p-4">
          <Badge className="bg-white/90 text-slate-700">{kind.label}</Badge>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border-transparent bg-white/90",
              isOpen ? "text-emerald-700" : "text-slate-600",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isOpen ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            {provider.status}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <CardContent className={cn("flex min-w-0 flex-1 flex-col px-5 pb-5", dashboard && "pt-5")}>
        <Avatar className={cn("size-14 ring-4 ring-card", !dashboard && "-mt-7", kind.avatar)}>
          <AvatarFallback className={cn("font-heading font-bold", kind.avatar)}>
            {provider.initials}
          </AvatarFallback>
        </Avatar>

        <h3 className="mt-3 text-lg font-semibold leading-tight">{provider.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          {provider.category}
          {provider.city && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="size-3.5" aria-hidden="true" />
              {provider.city}
            </>
          )}
        </p>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {provider.description || "Explore services from this provider."}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {provider.services.slice(0, 2).map((service) => (
            <Badge
              key={service.id}
              variant="secondary"
              title={service.bookable === false ? "Not currently available to book" : undefined}
              className={cn("rounded-md font-normal", service.bookable === false && "opacity-60")}
            >
              {service.name}
            </Badge>
          ))}
          {provider.services.length > 2 && (
            <Badge variant="outline" className="rounded-md font-normal">
              +{provider.services.length - 2} more
            </Badge>
          )}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {provider.hours}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {price !== null ? (
              <>
                from <span className="font-semibold text-foreground">{formatRand(price)}</span>
              </>
            ) : (
              "Price on request"
            )}
          </p>
          <Button asChild size="lg">
            <Link to={`${dashboard ? "/dashboard/customer/book" : "/providers"}/${encodeURIComponent(provider.id)}`}>
              View services
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}