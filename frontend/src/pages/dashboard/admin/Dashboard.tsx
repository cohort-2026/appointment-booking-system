import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminDashboard, runAdminJobs, type AdminJobResult, type AdminStats } from "../../../services/admin";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<{ stats: AdminStats } | { error: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult] = useState<AdminJobResult | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminDashboard()
      .then(({ stats }) => { if (active) setOverview({ stats }); })
      .catch((reason: unknown) => {
        if (active) setOverview({ error: reason instanceof Error ? reason.message : "Overview could not be loaded." });
      });
    return () => { active = false; };
  }, [retry]);

  async function runJobs() {
    setJobRunning(true);
    setJobResult(null);
    setJobError(null);
    try {
      setJobResult(await runAdminJobs());
    } catch (reason) {
      setJobError(reason instanceof Error ? reason.message : "The manual reminder job could not be run.");
    } finally {
      setJobRunning(false);
    }
  }

  const stats = overview && "stats" in overview ? overview.stats : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
      {!overview && <p role="status">Loading overview…</p>}
      {overview && "error" in overview && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert">{overview.error}</p>
          <Button variant="outline" onClick={() => { setOverview(null); setRetry((value) => value + 1); }}>Try again</Button>
        </div>
      )}
      {stats && (
        <section aria-label="Platform counts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total users", stats.totalUsers],
            ["Businesses", stats.totalBusinesses],
            ["Sole providers", stats.totalProviders],
            ["Bookings this month", stats.totalBookingsThisMonth],
          ].map(([label, count]) => (
            <Card key={label}>
              <CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold">{count}</CardContent>
            </Card>
          ))}
        </section>
      )}
      <Card>
        <CardHeader><CardTitle>Appointment reminders</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Send reminders for eligible appointments scheduled for tomorrow.</p>
          <Button type="button" onClick={() => void runJobs()} disabled={jobRunning}>
            {jobRunning ? "Running jobs…" : "Run jobs now"}
          </Button>
          {jobResult && (
            <p role="status">Attempted {jobResult.attempted}. Accepted {jobResult.accepted}. Failed {jobResult.failed}.</p>
          )}
          {jobError && <p role="alert">{jobError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
