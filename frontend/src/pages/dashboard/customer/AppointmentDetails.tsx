import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchAppointment, type SavedAppointment } from "../../../services/bookings";
import BookingConfirmation from "../../../components/booking/BookingConfirmation";
import { Button } from "../../../components/ui/button";

export default function AppointmentDetails() {
  const { id = "" } = useParams();
  const { search } = useLocation();
  const [retry, setRetry] = useState(0);
  const key = `${id}:${retry}`;
  const [result, setResult] = useState<{ key: string; data: SavedAppointment | null; error: string | null }>({ key: "", data: null, error: null });
  useEffect(() => {
    let active = true;
    void fetchAppointment(id).then(r => { if (active) setResult({ key, data: r.appointment, error: null }); })
      .catch(e => { if (active) setResult({ key, data: null, error: e instanceof Error ? e.message : "Unable to load appointment" }); });
    return () => { active = false; };
  }, [id, key]);
  return <div className="space-y-5"><Link className="text-sm font-semibold text-sky-700" to="/dashboard/customer/appointments">← Back to appointments</Link>
    {result.key !== key ? <p role="status" className="animate-pulse rounded-2xl bg-white p-10">Loading your saved appointment…</p>
      : result.error || !result.data ? <section className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-bold">Unable to display appointment</h1><p role="alert" className="my-4">{result.error ?? "Appointment not found"}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button></section>
      : <BookingConfirmation appointment={result.data} justBooked={new URLSearchParams(search).get("confirmed") === "1"} />}
  </div>;
}
