import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api";
import { getVerificationEmail } from "../../services/auth";
import { createAppointment, createMultipleAppointments, fetchProviderAvailability, type ProviderAvailabilityResponse } from "../../services/bookings";
import { bookingDraftPath, clearBookingDraft, draftBelongsToCustomer, isBookingDraftExpired, readBookingDraft, saveBookingDraft } from "../../lib/bookingDraft";
import { formatSast, sastDate } from "../../lib/bookingTime";
import type { Provider } from "../../types/providers";
import SlotPicker from "./SlotPicker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../../lib/utils";

export function BookingSkeleton() {
  return (
    <div role="status" aria-label="Loading booking" className="space-y-5">
      <span className="sr-only">Loading booking…</span>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-5 sm:p-7">
            <Skeleton className="h-6 w-56" />
            {[0, 1, 2].map((row) => <Skeleton key={row} className="h-24 w-full rounded-xl" />)}
            <Skeleton className="h-10 w-36" />
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-40" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingJourney(props: { provider: Provider; dashboard: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <BookingSkeleton />;
  if (user && user.role !== "CUSTOMER") return <p className="rounded-xl bg-amber-50 p-5">Please use a customer account to book an appointment.</p>;
  return <JourneyForm key={`${props.provider.id}:${user?.id ?? "guest"}`} {...props} />;
}

function JourneyForm({ provider, dashboard }: { provider: Provider; dashboard: boolean }) {
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
  const [starts, setStarts] = useState<string[]>(() => {
    if (!draft || isBookingDraftExpired(draft) || draft.date < sastDate()) return [];
    return draft.mode ? draft.startsAtList ?? [] : draft.startsAt ? [draft.startsAt] : [];
  });
  const [notes, setNotes] = useState(draft?.customerNotes ?? "");
  const [step, setStep] = useState(serviceId ? (starts.length ? 3 : 2) : 1);
  const [result, setResult] = useState<{ key: string; byDate: Record<string, ProviderAvailabilityResponse>; error: string | null }>({ key: "", byDate: {}, error: null });
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [signIn, setSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const selected = useRef(starts);
  const business = provider.kind === "BUSINESS";
  const source = dashboard ? "dashboard" as const : "public" as const;
  const returnTo = bookingDraftPath({ providerId: provider.id, source });
  const selectedDates = JSON.stringify([...new Set(starts.map(start => sastDate(new Date(start))))].sort());
  const key = JSON.stringify([provider.id, serviceId, date, staffId, user?.id, reload, selectedDates]);
  const loading = Boolean(serviceId && date) && result.key !== key;
  const data = result.key === key ? result.byDate[date] ?? null : null;
  const error = result.key === key ? result.error : null;
  const sortedStarts = [...starts].sort((first, second) => Date.parse(first) - Date.parse(second));
  const interval = data ? (data.service.durationMinutes + data.service.bufferAfterMinutes) * 60_000 : 0;
  const mode = starts.length <= 1 ? "single" : interval > 0 && sortedStarts.every((start, index) => index === 0 || (sastDate(new Date(start)) === sastDate(new Date(sortedStarts[index - 1])) && Date.parse(start) - Date.parse(sortedStarts[index - 1]) === interval)) ? "combined" : "separate";
  const dailyCounts = new Map<string, number>();
  for (const start of starts) {
    const selectedDate = sastDate(new Date(start));
    dailyCounts.set(selectedDate, (dailyCounts.get(selectedDate) ?? 0) + 1);
  }
  const exceedsDailyLimit = mode === "separate" && [...dailyCounts.values()].some(count => count > 3);
  const validSlot = starts.length > 0 && starts.length <= 12 && !exceedsDailyLimit && !!data && starts.every(start => result.byDate[sastDate(new Date(start))]?.slots.some(slot => slot.startsAt === start && slot.status === "AVAILABLE"));
  const duration = data?.service.durationMinutes ?? service?.duration ?? 0;
  const totalDuration = mode === "combined" ? duration * Math.max(1, starts.length) + (data?.service.bufferAfterMinutes ?? 0) * Math.max(0, starts.length - 1) : duration * Math.max(1, starts.length);
  const price = data ? data.service.expectedPrice === null ? null : Number(data.service.expectedPrice) : service?.price ?? null;
  const totalPrice = price === null ? null : price * Math.max(1, starts.length);

  useEffect(() => { selected.current = starts; }, [starts]);
  useEffect(() => {
    if (!serviceId) return;
    saveBookingDraft({ version: 1, providerId: provider.id, serviceId, date, ...(mode === "single" ? (starts[0] ? { startsAt: starts[0] } : {}) : { mode, startsAtList: starts }), ...(staffId ? { staffId } : {}),
      source, customerNotes: notes, savedAt: Date.now(), ...(user ? { customerId: user.id } : {}) });
  }, [provider.id, serviceId, date, starts, mode, staffId, source, notes, user]);
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
            setStaffId(""); setStarts([]); setStep(2); setNotice("Your selected staff member is no longer eligible. Please choose another.");
            return;
          } else available = await fetchProviderAvailability({ ...input, staffId });
        }
        if (!active) return;
        const dates = (JSON.parse(selectedDates) as string[]).filter(selectedDate => selectedDate !== date);
        const otherDays = await Promise.all(dates.map(async selectedDate => [selectedDate, await fetchProviderAvailability({ providerId: provider.id, serviceId, date: selectedDate, ...(business && staffId ? { staffId } : {}) })] as const));
        if (!active) return;
        const byDate = Object.fromEntries([[date, available], ...otherDays]);
        setResult({ key, byDate, error: null });
        const isAvailable = (start: string) => Date.parse(start) > Date.now() && byDate[sastDate(new Date(start))]?.slots.some(slot => slot.startsAt === start && slot.status === "AVAILABLE");
        if (selected.current.some(start => !isAvailable(start))) {
          setStarts(previous => previous.filter(isAvailable));
          const message = "A selected time is no longer available. Please review your selection.";
          setNotice(previous => previous || message); toast.error(message); setStep(2);
        }
      } catch (reason) {
        if (active) setResult({ key, byDate: {}, error: reason instanceof Error ? reason.message : "Availability could not be loaded." });
      }
    })();
    return () => { active = false; };
  }, [provider.id, serviceId, date, staffId, business, key, selectedDates]);

  async function handleConfirm(now: number) {
    if (submitting.current || !service || !validSlot || loading) return;
    if (starts.some(start => Date.parse(start) <= now)) { setStarts([]); setStep(2); setReload(n => n + 1); setNotice("That time has passed. Please choose another."); return; }
    const saved = saveBookingDraft({ version: 1, providerId: provider.id, serviceId, date, ...(mode === "single" ? { startsAt: starts[0] } : { mode, startsAtList: sortedStarts }), source,
      customerNotes: notes, savedAt: now, ...(staffId ? { staffId } : {}), ...(user ? { customerId: user.id } : {}) });
    if (!user) {
      if (!saved) { setNotice("Enable browser storage to keep your selection through sign-in."); return; }
      setSignIn(true); return;
    }
    submitting.current = true; setBusy(true); setNotice("");
    try {
      const input = { providerId: provider.id, serviceId, customerNotes: notes, ...(business ? { staffId } : {}) };
      const destination = mode === "single"
        ? `/dashboard/customer/appointments/${encodeURIComponent((await createAppointment({ ...input, startsAt: starts[0] })).appointment.id)}?confirmed=1`
        : mode === "combined"
          ? `/dashboard/customer/appointments/${encodeURIComponent((await createMultipleAppointments({ ...input, startsAt: sortedStarts, mode })).appointments[0].id)}?confirmed=1`
          : (await createMultipleAppointments({ ...input, startsAt: sortedStarts, mode }), "/dashboard/customer/appointments");
      clearBookingDraft();
      navigate(destination, { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`); return;
      }
      if (reason instanceof ApiError && [400, 403, 404, 409, 422].includes(reason.status)) {
        setNotice(reason.message); if (reason.status !== 409) setStarts([]); setStep(2);
        if (reason.status === 409) toast.error(reason.message);
      } else setNotice("The result is uncertain. Check My appointments before trying again; your selection is retained.");
      setReload(n => n + 1);
    } finally { submitting.current = false; setBusy(false); }
  }
  async function signInSubmit(event: FormEvent) {
    event.preventDefault(); setLoginBusy(true); setLoginError("");
    try { await login(email.trim(), password); }
    catch (reason) {
      const verificationEmail = getVerificationEmail(reason);
      if (verificationEmail) navigate("/verify-email", { state: { email: verificationEmail, returnTo } });
      else setLoginError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally { setLoginBusy(false); }
  }
    return <section aria-label="Book an appointment" className="space-y-5">
    <Tabs value={String(step)} onValueChange={value => setStep(Number(value))}>
      <TabsList aria-label="Booking progress" className="grid h-auto! w-full grid-cols-3">
        {["Service", "Time", "Confirm"].map((label, index) => <TabsTrigger key={label} value={String(index + 1)} disabled={busy || index + 1 > step}
          className="min-h-11 text-sm font-semibold data-[state=active]:bg-linear-to-b data-[state=active]:from-(--primary-gradient-from) data-[state=active]:to-(--primary-gradient-to) data-[state=active]:text-primary-foreground">
          {index + 1}. {label}
        </TabsTrigger>)}
      </TabsList>
    </Tabs>
    {notice && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{notice} <Link className="underline" to="/dashboard/customer/appointments">My appointments</Link></p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="min-w-0 gap-0 py-0"><CardContent className="p-5 sm:p-7">
        {step === 1 && <><h2 className="mb-5 font-heading text-xl font-bold">Choose your service</h2><div className="space-y-3">{services.length ? services.map(s => <button key={s.id} type="button" aria-pressed={serviceId === s.id}
          onClick={() => { if (serviceId !== s.id) { setServiceId(s.id); setStaffId(""); setStarts([]); } setNotice(""); }}
          className={cn("w-full rounded-xl border bg-card p-4 text-left transition-colors", serviceId === s.id ? "border-primary bg-accent" : "hover:border-primary/60")}>
          <span className="block font-semibold">{s.name}</span><span className="mt-1 block text-sm text-muted-foreground">{s.description}</span>
          <span className="mt-3 block text-sm">{s.duration} minutes · {s.price === null ? "Price on request" : `R${s.price.toFixed(2)}`}</span>
        </button>) : <p className="text-sm text-muted-foreground">No services are currently available for booking.</p>}</div><Button className="mt-5 min-h-11" disabled={!service} onClick={() => setStep(2)}>Choose a time</Button></>}
        {step === 2 && <><h2 className="mb-5 font-heading text-xl font-bold">Find a time that suits you</h2>
          <SlotPicker date={date} onDateChange={setDate}
          business={business} staff={data?.staff ?? []} staffId={staffId} onStaffChange={v => { if (v !== staffId) { setStaffId(v); setStarts([]); } }}
          slots={data?.slots ?? []} selected={starts[0] ?? ""} selectedSlots={starts} maxSelections={12}
          onSelect={value => setStarts(previous => previous.includes(value) ? previous.filter(start => start !== value) : previous.length < 12 ? [...previous, value] : previous)} loading={loading} disabled={busy}
          error={error} onRetry={() => setReload(n => n + 1)} />
          <p className="mt-3 text-sm text-muted-foreground">{starts.length} of 12 times selected</p>
          {sortedStarts.length > 0 && <ul aria-label="Selected times" className="mt-3 space-y-2">{sortedStarts.map(start => <li key={start} className="flex items-center justify-between gap-3 text-sm"><span>{formatSast(start)}</span><button type="button" disabled={busy} onClick={() => setStarts(previous => previous.filter(value => value !== start))} aria-label={`Remove ${formatSast(start)}`} title="Remove time" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"><X className="size-4" aria-hidden="true" /></button></li>)}</ul>}
          {exceedsDailyLimit && <p role="alert" className="mt-3 text-sm text-rose-700">Choose no more than 3 appointments per day.</p>}
          <Button className="mt-5 min-h-11" disabled={!validSlot || loading || busy} onClick={() => setStep(3)}>Review booking</Button></>}
        {step === 3 && <><h2 className="font-heading text-xl font-bold">Review your appointment</h2><p className="mt-3 text-sm text-muted-foreground">{user ? "Confirm the details below to save your appointment." : "Review your selection, then sign in or create a customer account to book."}</p>
          <div className="mt-5 space-y-1 font-semibold">{sortedStarts.length ? sortedStarts.map(start => <p key={start}>{formatSast(start)}</p>) : "Choose an available time"}</div>
          {mode !== "single" && <p className="mt-2 text-sm text-muted-foreground">{mode === "combined" ? "One combined appointment" : `${starts.length} separate appointments`}</p>}
          <label className="mt-5 block space-y-2 text-sm font-medium">Notes for the provider (optional)<Textarea value={notes} maxLength={500} disabled={busy} onChange={e => setNotes(e.target.value)} placeholder="Anything useful to know before your visit" /></label>
          <p className="mt-2 text-right text-xs text-muted-foreground">{Array.from(notes).length}/500</p>
          <p className="mt-4 rounded-xl bg-accent p-4 text-sm text-accent-foreground">Changes must be requested at least {data?.cancellationCutoffHours ?? 24} hours before the appointment. No online payment is collected.</p>
          {loading && <Skeleton role="status" aria-label="Rechecking your selected time" className="mt-3 h-5 w-56" />}{error && <p role="alert" className="mt-3 text-rose-700">{error} <button className="underline" onClick={() => setReload(n => n + 1)}>Retry</button></p>}
          <Button className="mt-5 min-h-12 w-full" disabled={!validSlot || loading || busy} onClick={() => void handleConfirm(Date.now())}>{busy ? "Saving appointment…" : user ? "Confirm appointment" : "Sign in to book"}</Button></>}
      </CardContent></Card>
      <aside aria-label="Booking summary" className="lg:sticky lg:top-24">
        <Card className="gap-0 overflow-hidden py-0">
          <div aria-hidden="true" className="h-1.5 bg-linear-to-r from-(--primary-gradient-from) to-(--primary-gradient-to)" />
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">Your appointment</p>
            <h2 className="mt-3 font-heading text-xl font-bold">{provider.name}</h2><p className="mt-1 text-sm text-muted-foreground">{business ? "Business" : "Independent provider"}</p>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-muted-foreground">Service</dt><dd className="mt-1 font-medium">{service?.name ?? "Choose a service"}</dd></div>
              {business && <div><dt className="text-muted-foreground">Staff</dt><dd className="mt-1 font-medium">{data?.staff.find(s => s.id === staffId)?.name ?? "Choose a staff member"}</dd></div>}
              <div><dt className="text-muted-foreground">Date and time</dt><dd className="mt-1 space-y-1 font-medium">{sortedStarts.length ? sortedStarts.map(start => <div key={start}>{formatSast(start)}</div>) : "Choose a time"}</dd></div>
              <div><dt className="text-muted-foreground">{mode === "single" ? "Duration" : "Total duration"}</dt><dd className="mt-1 font-medium">{service ? `${totalDuration} minutes` : "—"}</dd></div>
              <div className="border-t pt-4"><dt className="text-muted-foreground">{mode === "single" ? "Service price" : "Total price"}</dt><dd className="mt-1 text-xl font-bold">{totalPrice === null ? "On request" : `R${totalPrice.toFixed(2)}`}</dd></div></dl>
          </CardContent>
        </Card>
      </aside>
    </div>
    <Dialog open={signIn} onOpenChange={setSignIn}><DialogContent><DialogHeader><DialogTitle>Sign in to book</DialogTitle><DialogDescription>Your selection is saved. We’ll check the time again after sign-in.</DialogDescription></DialogHeader>
      <form onSubmit={signInSubmit} className="space-y-4">{loginError && <p role="alert" className="text-rose-700">{loginError}</p>}
        <label className="block space-y-2">Email<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block space-y-2">Password<Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <Button className="w-full" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-sm">New here? <Link className="font-semibold text-sky-700 underline" to={`/register/customer?returnTo=${encodeURIComponent(returnTo)}`}>Create a customer account</Link></p>
      </form></DialogContent></Dialog>
  </section>;
}
