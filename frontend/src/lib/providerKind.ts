import type { Provider } from "../types/providers"

export const KIND_STYLE: Record<
  Provider["kind"],
  { label: string; header: string; avatar: string }
> = {
  BUSINESS: {
    label: "Business",
    header: "from-sky-400 via-sky-500 to-blue-700",
    avatar: "bg-sky-50 text-sky-700",
  },
  SOLE_PROVIDER: {
    label: "Sole provider",
    header: "from-violet-400 via-violet-500 to-indigo-700",
    avatar: "bg-violet-50 text-violet-700",
  },
}

export function formatRand(amount: number) {
  return `R${amount.toLocaleString("en-ZA")}`
}