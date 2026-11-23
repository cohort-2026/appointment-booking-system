import { useBusinessDashboard } from "@/context/BusinessDashboardContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function BusinessPackage() {
  const { data, loading, error } = useBusinessDashboard();
  if (loading) return <p role="status">Loading subscription…</p>;
  if (error) return <p role="alert">Unable to load subscription: {error}. Reload this page to try again.</p>;
  const subscription = data?.subscription;

  return <div className="mx-auto max-w-3xl space-y-6">
    <Card>
      <CardHeader><CardTitle>Your subscription</CardTitle></CardHeader>
      <CardContent>
        {subscription ? <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Plan</dt><dd>{subscription.tier}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{subscription.status}</dd></div>
          <div><dt className="text-muted-foreground">Payment status</dt><dd>{subscription.tier === "BASIC" ? "Free — no payment required" : subscription.paymentStatus}</dd></div>
          <div><dt className="text-muted-foreground">Staff limit</dt><dd>{subscription.maxStaff ?? "Not specified"}</dd></div>
          <div><dt className="text-muted-foreground">Daily appointment limit per staff member</dt><dd>{subscription.dailyAppointmentLimit ?? "Not specified"}</dd></div>
        </dl> : <p>No active subscription was returned for this account.</p>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Plan changes and payments</CardTitle></CardHeader>
      <CardContent>
        <p>Paid upgrades and online payments are unavailable.</p>
      </CardContent>
    </Card>
  </div>;
}
