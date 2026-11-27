import { useBusinessDashboard } from "@/context/BusinessDashboardContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function BusinessPackage() {
  const { data, loading, error } = useBusinessDashboard();
  if (loading) return <DashboardSkeleton detail label="Loading subscription" />;
  if (error) return <p role="alert">Unable to load subscription: {error}. Reload this page to try again.</p>;
  const subscription = data?.subscription;

  return <div className="mx-auto max-w-3xl space-y-6">
    <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
      <div className="h-1.5 bg-primary" />
      <CardHeader className="rounded-none border-b border-slate-100 bg-sky-50/50 p-6"><CardTitle>Your subscription</CardTitle></CardHeader>
      <CardContent className="p-6">
        {subscription ? <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Plan</dt><dd>{subscription.tier}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{subscription.status}</dd></div>
          <div><dt className="text-muted-foreground">Payment status</dt><dd>{subscription.tier === "BASIC" ? "Free — no payment required" : subscription.paymentStatus}</dd></div>
          <div><dt className="text-muted-foreground">Staff limit</dt><dd>{subscription.maxStaff ?? "Not specified"}</dd></div>
          <div><dt className="text-muted-foreground">Daily appointment limit per staff member</dt><dd>{subscription.dailyAppointmentLimit ?? "Not specified"}</dd></div>
        </dl> : <p>No active subscription was returned for this account.</p>}
      </CardContent>
    </Card>
    <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
      <div className="h-1.5 bg-primary" />
      <CardHeader className="rounded-none border-b border-slate-100 bg-sky-50/50 p-6"><CardTitle>Plan changes and payments</CardTitle></CardHeader>
      <CardContent className="p-6">
        <p>Paid upgrades and online payments are unavailable.</p>
      </CardContent>
    </Card>
  </div>;
}
