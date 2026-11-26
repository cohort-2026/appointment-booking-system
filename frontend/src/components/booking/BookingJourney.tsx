import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api";
import { getVerificationEmail } from "../../services/auth";
import { createAppointment, fetchProviderAvailability, type ProviderAvailabilityResponse } from "../../services/bookings";
import { bookingDraftPath, clearBookingDraft, draftBelongsToCustomer, isBookingDraftExpired, readBookingDraft, saveBookingDraft } from "../../lib/bookingDraft";
import { formatSast, sastDate } from "../../lib/bookingTime";
import type { Provider } from "../../types/providers";
import SlotPicker from "./SlotPicker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type InlineBooking = {
  customerId: string;
  providerId: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
};

export default function BookingJourney(props: { provider: Provider; dashboard: boolean }) {
  const { user, loading } = useAuth();
  const [inlineBooking, setInlineBooking] = useState<InlineBooking | null>(null);
  if (loading) return <p role="status">Restoring your account…</p>;
  if (user && user.role !== "CUSTOMER") return <p className="rounded-xl bg-amber-50 p-5">Please use a customer account to book an appointment.</p>;
  return <JourneyForm key={`${props.provider.id}:${user?.id ?? "guest"}`} {...props}
    inlineBooking={inlineBooking?.customerId === user?.id && inlineBooking?.providerId === props.provider.id ? inlineBooking : null}
    setInlineBooking={setInlineBooking} />;
}

function JourneyForm({ provider, dashboard, inlineBooking, setInlineBooking }: {
  provider: Provider;
  dashboard: boolean;
  inlineBooking: InlineBooking | null;
  setInlineBooking: (booking: InlineBooking | null) => void;
}) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [draft] = useState(() => {
    const stored = readBookingDraft();
    return stored?.providerId === provider.id && (!stored.customerId || (user && draftBelongsToCustomer(stored, user.id))) ? stored : null;
  });
  const services = provider.services.filter(s => s.bookable !== false);
  const [serviceId, setServiceId] = useState(() => services.some(s => s.id === draft?.serviceId) ? draft!.serviceId : "");
  const service = services.find(s => s.id === serviceId);
  const [date, setDate] = useState(draft && draft.date >= sastDate() ? draft.date : sastDate());
  const [staffId, setStaffId] = useState(provider.kind === "BUSINESS" ? draft?.staffId ?? "" : "");
  const [startsAt, setStartsAt] = useState(() => draft && !isBookingDraftExpired(draft) && Date.parse(draft.startsAt ?? "") > Date.now() ? draft.startsAt! : "");
  const [notes, setNotes] = useState(draft?.customerNotes ?? "");
  const [step, setStep] = useState(serviceId ? (startsAt ? 3 : 2) : 1);
  const [result, setResult] = useState<{ key: string; data: ProviderAvailabilityResponse | null; error: string | null }>({ key: "", data: null, error: null });
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [signIn, setSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const selected = useRef(startsAt);
  const business = provider.kind === "BUSINESS";
  const source = dashboard ? "dashboard" as const : "public" as const;
  const returnTo = bookingDraftPath({ providerId: provider.id, source });
  const key = JSON.stringify([provider.id, serviceId, date, staffId, user?.id, reload]);
  const loading = Boolean(serviceId && date) && result.key !== key;
  const data = result.key === key ? result.data : null;
  const error = result.key === key ? result.error : null;
  const validSlot = !!data?.slots.some(s => s.startsAt === startsAt && s.status === "AVAILABLE");

  useEffect(() => { selected.current = startsAt; }, [startsAt]);
  useEffect(() => {
    if (!serviceId) return;
    saveBookingDraft({ version: 1, providerId: provider.id, serviceId, date, ...(startsAt ? { startsAt } : {}), ...(staffId ? { staffId } : {}),
      source, customerNotes: notes, savedAt: Date.now(), ...(user ? { customerId: user.id } : {}) });
  }, [provider.id, serviceId, date, startsAt, staffId, source, notes, user]);
  useEffect(() => {
    if (!serviceId || !date) return;
    let active = true;
    void (async () => {
      try {
        const input = { providerId: provider.id, serviceId, date };
        let available = await fetchProviderAvailability(input);
        if (!active) return;
        if (business && staffId) {
          if (!available.staff.some(s => s.id === staffId)) {
            setStaffId(""); setStartsAt(""); setNotice("Your selected staff member is no longer eligible. Please choose another.");
          } else available = await fetchProviderAvailability({ ...input, staffId });
        }
        if (!active) return;
        setResult({ key, data: available, error: null });
        if (selected.current && !available.slots.some(s => s.startsAt === selected.current && s.status === "AVAILABLE")) {
          setStartsAt(""); setNotice("Your selected time is no longer available. Please select another time."); setStep(2);
        }
      } catch (reason) {
        if (active) setResult({ key, data: null, error: reason instanceof Error ? reason.message : "Availability could not be loaded." });
      }
    })();
    return () => { active = false; };
  }, [provider.id, serviceId, date, staffId, business, key]);

  async function confirm(afterInlineSignIn = false) {
    if (submitting.current || !service || !validSlot || loading) return;
    if (Date.parse(startsAt) <= Date.now()) { setStartsAt(""); setStep(2); setReload(n => n + 1); setNotice("That time has passed. Please choose another."); return; }
    const saved = saveBookingDraft({ version: 1, providerId: provider.id, serviceId, date, startsAt, source,
      customerNotes: notes, savedAt: Date.now(), ...(staffId ? { staffId } : {}), ...(user ? { customerId: user.id } : {}) });
    if (!user) {
      if (!saved) { setNotice("Enable browser storage to keep your selection through sign-in."); return; }
      setSignIn(true); return;
    }
    submitting.current = true; setBusy(true); setNotice("");
    try {
      const response = await createAppointment({ providerId: provider.id, serviceId, startsAt, customerNotes: notes,
        ...(business ? { staffId } : {}) });
      clearBookingDraft();
      if (afterInlineSignIn) toast.success("Appointment confirmed.");
      navigate(`/dashboard/customer/appointments/${encodeURIComponent(response.appointment.id)}?confirmed=1`, { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`); return;
      }
      if (reason instanceof ApiError && [400, 403, 404, 409, 422].includes(reason.status)) {
        setNotice(reason.message); setStartsAt(""); setStep(2);
      } else setNotice("The result is uncertain. Check My appointments before trying again; your selection is retained.");
      setReload(n => n + 1);
    } finally { submitting.current = false; setBusy(false); }
  }
  // The account change remounts the form. Resume only the selection explicitly
  // approved in the inline dialog, after the new session has rechecked availability.
  const confirmAfterSignIn = useEffectEvent(() => {
    if (!inlineBooking) return;
    setInlineBooking(null);
    if (inlineBooking.serviceId === serviceId && inlineBooking.staffId === staffId &&
        inlineBooking.startsAt === startsAt && validSlot) {
      void confirm(true);
    }
  });
  useEffect(() => {
    if (inlineBooking && !loading) confirmAfterSignIn();
  }, [inlineBooking, loading]);

  async function signInSubmit(event: FormEvent) {
    event.preventDefault();
    if (loginBusy || loading || !validSlot) return;
    setLoginBusy(true); setLoginError("");
    try {
      const signedInUser = await login(email.trim(), password);
      if (signedInUser.role === "CUSTOMER") {
        setInlineBooking({ customerId: signedInUser.id, providerId: provider.id, serviceId, staffId, startsAt });
      }
    }
    catch (reason) {
      const verificationEmail = getVerificationEmail(reason);
      if (verificationEmail) navigate("/verify-email", { state: { email: verificationEmail, returnTo } });
      else setLoginError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally { setLoginBusy(false); }
  }
  return <section aria-label="Book an appointment" className="space-y-5">
    <ol className="flex gap-2" aria-label="Booking progress">{["Service", "Time", "Confirm"].map((label, index) => <li key={label} className="flex-1"><button type="button" disabled={busy || index + 1 > step}
      aria-current={step === index + 1 ? "step" : undefined} onClick={() => setStep(index + 1)}
      className={`min-h-11 w-full rounded-xl px-2 py-3 text-sm font-semibold ${step === index + 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{index + 1}. {label}</button></li>)}</ol>
    {notice && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{notice} <Link className="underline" to="/dashboard/customer/appointments">My appointments</Link></p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        {step === 1 && <><h2 className="mb-5 text-xl font-bold">Choose your service</h2><div className="space-y-3">{services.length ? services.map(s => <button key={s.id} type="button" aria-pressed={serviceId === s.id}
          onClick={() => { setServiceId(s.id); setStaffId(""); setStartsAt(""); setNotice(""); }}
          className={`w-full rounded-xl border p-4 text-left ${serviceId === s.id ? "border-sky-600 bg-sky-50" : "border-slate-200 hover:border-sky-400"}`}>
          <span className="block font-semibold">{s.name}</span><span className="mt-1 block text-sm text-slate-500">{s.description}</span>
          <span className="mt-3 block text-sm">{s.duration} minutes · {s.price === null ? "Price on request" : `R${s.price.toFixed(2)}`}</span>
        </button>) : <p>No services are currently available for booking.</p>}</div><Button className="mt-5 min-h-11" disabled={!service} onClick={() => setStep(2)}>Choose a time</Button></>}
        {step === 2 && <><h2 className="mb-5 text-xl font-bold">Find a time that suits you</h2><SlotPicker date={date} onDateChange={v => { setDate(v); setStartsAt(""); }}
          business={business} staff={data?.staff ?? []} staffId={staffId} onStaffChange={v => { setStaffId(v); setStartsAt(""); }}
          slots={data?.slots ?? []} selected={startsAt} onSelect={setStartsAt} loading={loading} disabled={busy}
          error={error} onRetry={() => setReload(n => n + 1)} />
          <Button className="mt-5 min-h-11" disabled={!validSlot || loading || busy} onClick={() => setStep(3)}>Review booking</Button></>}
        {step === 3 && <><h2 className="text-xl font-bold">Review your appointment</h2><p className="mt-3 text-sm text-slate-600">{user ? "Confirm the details below to save your appointment." : "Review your selection, then sign in or create a customer account to book."}</p>
          <p className="mt-5 font-semibold">{startsAt ? formatSast(startsAt) : "Choose an available time"}</p>
          <label className="mt-5 block space-y-2 text-sm font-medium">Notes for the provider (optional)<Textarea value={notes} maxLength={500} disabled={busy} onChange={e => setNotes(e.target.value)} placeholder="Anything useful to know before your visit" /></label>
          <p className="mt-2 text-right text-xs text-slate-500">{Array.from(notes).length}/500</p>
          <p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">Changes must be requested at least {data?.cancellationCutoffHours ?? 24} hours before the appointment. No online payment is collected.</p>
          {loading && <p role="status" className="mt-3">Rechecking your selected time…</p>}{error && <p role="alert" className="mt-3 text-rose-700">{error} <button className="underline" onClick={() => setReload(n => n + 1)}>Retry</button></p>}
          <Button className="mt-5 min-h-12 w-full" disabled={!validSlot || loading || busy || !!inlineBooking} onClick={() => void confirm()}>{busy || inlineBooking ? "Saving appointment…" : user ? "Confirm appointment" : "Sign in to book"}</Button></>}
      </div>
      <aside aria-label="Booking summary" className="rounded-2xl bg-slate-950 p-5 text-white lg:sticky lg:top-24"><p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Your appointment</p>
        <h2 className="mt-3 text-xl font-bold">{provider.name}</h2><p className="mt-1 text-sm text-slate-300">{business ? "Business" : "Independent provider"}</p>
        <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-400">Service</dt><dd className="mt-1">{service?.name ?? "Choose a service"}</dd></div>
          {business && <div><dt className="text-slate-400">Staff</dt><dd className="mt-1">{data?.staff.find(s => s.id === staffId)?.name ?? "Choose a staff member"}</dd></div>}
          <div><dt className="text-slate-400">Date and time</dt><dd className="mt-1">{startsAt ? formatSast(startsAt) : "Choose a time"}</dd></div>
          <div><dt className="text-slate-400">Duration</dt><dd className="mt-1">{service ? `${data?.service.durationMinutes ?? service.duration} minutes` : "—"}</dd></div>
          <div className="border-t border-white/20 pt-4"><dt className="text-slate-400">Service price</dt><dd className="mt-1 text-xl font-bold">{data ? (data.service.expectedPrice === null ? "On request" : `R${Number(data.service.expectedPrice).toFixed(2)}`) : service?.price != null ? `R${service.price.toFixed(2)}` : "On request"}</dd></div></dl>
      </aside>
    </div>
    <Dialog open={signIn} onOpenChange={open => { if (!loginBusy) setSignIn(open); }}><DialogContent><DialogHeader><DialogTitle>Sign in to book</DialogTitle><DialogDescription>We’ll recheck your selected time and confirm the appointment after you sign in.</DialogDescription></DialogHeader>
      <form onSubmit={signInSubmit} className="space-y-4">{loginError && <p role="alert" className="text-rose-700">{loginError}</p>}
        <label className="block space-y-2">Email<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block space-y-2">Password<Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <Button className="w-full" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in and book"}</Button>
        <p className="text-sm">New here? <Link className="font-semibold text-sky-700 underline" to={`/register/customer?returnTo=${encodeURIComponent(returnTo)}`}>Create a customer account</Link></p>
      </form></DialogContent></Dialog>
  </section>;
}
