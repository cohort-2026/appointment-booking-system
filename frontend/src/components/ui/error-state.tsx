import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border rounded-xl border-red-200 bg-red-50">
      <AlertCircle className="h-8 w-8 text-red-600 mb-3" />
      <p role="alert" className="text-sm font-semibold text-red-900">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-4 border-red-300 bg-white text-red-800 hover:bg-red-100"
      >
        Try again
      </Button>
    </div>
  )
}
