import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchProvider } from "../../../services/providers";
import { createAppointment, fetchProviderAvailability, type ProviderAvailabilityResponse } from "../../../services/bookings";
import { useAuth } from "../../../hooks/useAuth";
import { getVerificationEmail } from "../../../services/auth";
import type { Provider, ProviderService } from "../../../types/providers";

const SERVICES_PER_PAGE = 6;
const BOOKING_DRAFT_KEY = "appointment-booking-draft";

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default function ProviderProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();
  const [providerState, setProviderState] = useState<{ id: string; provider: Provider | null; error: string | null }>({ id: "", provider: null, error: null });
  const [servicePageState, setServicePageState] = useState({ id: "", page: 1 });
  const [bookingService, setBookingService] = useState<ProviderService | null>(null);
  const [bookingDate, setBookingDate] = useState(() => localDateString(new Date()));
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [bookingStaff, setBookingStaff] = useState("");
  const [bookingAvailability, setBookingAvailability] = useState<ProviderAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [availabilityReload, setAvailabilityReload] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInSubmitting, setSignInSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const isLoading = Boolean(id) && providerState.id !== id;
  const provider = providerState.id === id ? providerState.provider : null;
  const loadError = providerState.id === id ? providerState.error : null;
  const servicePage = servicePageState.id === id ? servicePageState.page : 1;

  useEffect(() => {
    if (authLoading || !signInOpen || user?.role !== "CUSTOMER") return;
    setSignInOpen(false);
    navigate("/dashboard/customer", { replace: true });
  }, [authLoading, signInOpen, user?.role, navigate]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchProvider(id)
      .then((data) => { if (active) setProviderState({ id, provider: data, error: null }); })
      .catch((error: unknown) => {
        console.error("Public provider detail fetch failed:", error);
        if (active) setProviderState({ id, provider: null, error: error instanceof Error ? error.message : "Unable to load provider." });
      });
    return () => { active = false; };
  }, [id]);

  // Keep the customer's in-progress selection while they sign in or verify a new account.
  useEffect(() => {
    if (!provider || typeof window === "undefined") return;
    try {
      const draft = JSON.parse(window.localStorage.getItem(BOOKING_DRAFT_KEY) ?? "null") as
        | { providerId?: string; serviceId?: string; date?: string; startsAt?: string; staffId?: string }
        | null;
      if (!draft || draft.providerId !== provider.id || !draft.serviceId) return;
      const service = provider.services.find((item) => item.id === draft.serviceId);
      if (!service) return;
      setBookingService(service);
      if (draft.date) setBookingDate(draft.date);
      if (draft.startsAt) setBookingTime(draft.startsAt);
      if (draft.staffId) setBookingStaff(draft.staffId);
    } catch {
      window.localStorage.removeItem(BOOKING_DRAFT_KEY);
    }
  }, [provider?.id]);

  useEffect(() => {
    if (!bookingService || !provider || typeof window === "undefined") return;
    window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({
      providerId: provider.id,
      serviceId: bookingService.id,
      date: bookingDate,
      ...(bookingTime ? { startsAt: bookingTime } : {}),
      ...(bookingStaff ? { staffId: bookingStaff } : {}),
    }));
  }, [provider?.id, bookingService?.id, bookingDate, bookingTime, bookingStaff]);

  useEffect(() => {
    if (!provider || !bookingService || !bookingDate) return;
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    setBookingAvailability(null);

    void fetchProviderAvailability({
      providerId: provider.id,
      serviceId: bookingService.id,
      date: bookingDate,
      ...(provider.kind === "BUSINESS" && bookingStaff ? { staffId: bookingStaff } : {}),
    })
      .then((availability) => {
        if (active) setBookingAvailability(availability);
      })
      .catch((error: unknown) => {
        if (active) setAvailabilityError(error instanceof Error ? error.message : "Unable to load availability.");
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [provider?.id, provider?.kind, bookingService?.id, bookingDate, bookingStaff, availabilityReload]);

  if (isLoading) {
    return <section className="min-h-[60vh] bg-[#F8FAFC] py-14"><div className="mx-auto max-w-7xl animate-pulse px-6 lg:px-8" role="status" aria-label="Loading provider"><div className="h-5 w-32 rounded bg-slate-200" /><div className="mt-8 h-28 rounded-2xl bg-white" /><div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-2xl border border-slate-200 bg-white p-6"><div className="h-5 w-1/2 rounded bg-slate-200" /><div className="mt-5 h-12 rounded bg-slate-100" /></div>)}</div></div></section>;
  }

  if (!provider) {
    return (
      <section className="min-h-[60vh] bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="font-[Clash_Display] text-3xl font-bold text-[#0F172A]">
              Provider not found
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              {loadError ? "Provider details could not be loaded. Please try again." : "The provider you are looking for does not exist or is no longer available."}
            </p>

            <Link
              to="/providers"
              className="mt-6 inline-flex rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
            >
              Back to providers
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isOpen = provider.status === "Open";
  const totalServicePages = Math.max(
    1,
    Math.ceil(provider.services.length / SERVICES_PER_PAGE)
  );
  const paginatedServices = provider.services.slice(
    (servicePage - 1) * SERVICES_PER_PAGE,
    servicePage * SERVICES_PER_PAGE
  );
  const openBookingPreview = (service: ProviderService) => {
    setBookingService(service);
    setBookingDate(localDateString(new Date()));
    setBookingTime(null);
    setBookingStaff("");
    setBookingAvailability(null);
    setAvailabilityError(null);
  };

  const submitBooking = async () => {
    if (!bookingService || !bookingTime) return;

    setBookingSubmitting(true);
    try {
      const response = await createAppointment({
        providerId: provider.id,
        serviceId: bookingService.id,
        startsAt: bookingTime,
        ...(provider.kind === "BUSINESS" ? { staffId: bookingStaff } : {}),
      });
      window.localStorage.removeItem(BOOKING_DRAFT_KEY);
      toast.success("Appointment confirmed.");
      setSignInOpen(false);
      setSignInError(null);
      setBookingService(null);
      setBookingTime(null);
      setAvailabilityReload((current) => current + 1);
      navigate(`/dashboard/customer/appointments/${encodeURIComponent(response.appointment.id)}?confirmed=1`, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create appointment.";
      toast.error(message);
      setBookingTime(null);
      setAvailabilityReload((current) => current + 1);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleBookingSubmit = async () => {
    if (!bookingDate || bookingDate < localDateString(new Date())) {
      toast.error("Choose today or a future date.");
      return;
    }
    if (bookingTime === null) {
      toast.error("Select an available time.");
      return;
    }
    if (provider.kind === "BUSINESS" && !bookingStaff) {
      toast.error("Choose an available staff member.");
      return;
    }
    if (!user || user.role !== "CUSTOMER") {
      setSignInError(user ? "Please sign in with a customer account to continue." : null);
      setSignInOpen(true);
      return;
    }

    await submitBooking();
  };

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInSubmitting(true);
    setSignInError(null);
    try {
      const signedInUser = await login(signInEmail.trim(), signInPassword);
      if (signedInUser.role !== "CUSTOMER") {
        setSignInError("Bookings require a customer account. Sign in with a customer account or choose Get Started.");
        return;
      }

      setSignInOpen(false);
      setSignInError(null);
      toast.success("Signed in successfully.");
      navigate("/dashboard/customer", { replace: true });
    } catch (error) {
      const unverifiedEmail = getVerificationEmail(error);
      if (unverifiedEmail) {
        const emailSent = (error as { data?: { emailSent?: boolean } } | null)?.data?.emailSent !== false;
        setSignInOpen(false);
        navigate("/verify-email", { state: { email: unverifiedEmail, emailSent } });
        return;
      }
      setSignInError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setSignInSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Provider heading */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <Link
            to="/providers"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0EA5E9] transition-colors hover:text-sky-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to providers
          </Link>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] font-[Clash_Display] text-xl font-bold text-[#38BDF8] ring-1 ring-white/10">
                {provider.initials}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[#0EA5E9]">
                    {provider.category}
                  </p>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      isOpen
                        ? "bg-green-50 text-[#22C55E]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOpen ? "bg-[#22C55E]" : "bg-slate-400"
                      }`}
                    />
                    {provider.status}
                  </span>
                </div>

                <h1 className="mt-2 font-[Clash_Display] text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl">
                  {provider.name}
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-[#334155]">
                  {provider.description}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-5 py-4 md:min-w-52">
              <p className="text-xs font-medium text-slate-400">
                Business hours
              </p>

              <p className="mt-2 text-lg font-semibold text-[#0F172A]">
                {provider.hours}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0EA5E9]/25 to-transparent" />
      </section>

      {/* Services */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[Clash_Display] text-3xl font-bold text-[#0F172A]">
                Choose a service
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#334155]">
                Select the service you want to book. You will choose an
                available appointment time in the next step.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {provider.services.length}{" "}
              {provider.services.length === 1 ? "service" : "services"} available
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginatedServices.map((service) => (
              <article
                key={service.id}
                className={`flex h-full flex-col rounded-2xl border p-6 transition duration-200 ${!isOpen || service.bookable === false ? "border-slate-200 bg-slate-100 opacity-70" : "border-slate-200 bg-white hover:-translate-y-1 hover:border-[#0EA5E9]/40 hover:shadow-xl hover:shadow-slate-200/60"}`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[#0F172A]">
                    {service.name}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#334155]">
                    {service.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Duration
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#334155]">
                        {service.duration} minutes
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400">
                        Price
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#0EA5E9]">
                        {service.price === null ? "Price not set" : `R${service.price}`}
                      </p>
                    </div>
                  </div>
                </div>

                {!isOpen || service.bookable === false ? (
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
                    aria-label={!isOpen ? "Provider is currently closed" : service.assigned === false ? "No staff assigned to this service" : "This service is unavailable for booking"}
                  >
                    {!isOpen ? "Provider is closed" : service.assigned === false ? "No staff assigned" : "Currently unavailable"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openBookingPreview(service)}
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(14,165,233,0)] transition-all duration-200 hover:bg-[#38BDF8] hover:shadow-[0_0_20px_-4px_rgba(14,165,233,0.5)]"
                  >
                    Book appointment
                  </button>
                )}
              </article>
            ))}
          </div>

          {totalServicePages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setServicePageState({ id: id ?? "", page: Math.max(1, servicePage - 1) })}
                disabled={servicePage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalServicePages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setServicePageState({ id: id ?? "", page })}
                  className={`h-10 w-10 rounded-lg text-sm font-semibold transition-colors ${
                    servicePage === page
                      ? "bg-[#0EA5E9] text-white shadow-[0_4px_14px_-4px_rgba(14,165,233,0.5)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setServicePageState({ id: id ?? "", page: Math.min(totalServicePages, servicePage + 1) })}
                disabled={servicePage === totalServicePages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {bookingService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBookingService(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-preview-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase text-sky-700">Appointment booking</p>
                <h2 id="booking-preview-title" className="mt-1 font-[Clash_Display] text-2xl font-bold text-slate-950">
                  Book with {provider.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { window.localStorage.removeItem(BOOKING_DRAFT_KEY); setBookingService(null); }}
                aria-label="Close booking form"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="m18 6-12 12M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="space-y-6 p-5 sm:p-7">
              <div>
                <label htmlFor="booking-date" className="mb-1.5 block text-sm font-semibold text-slate-800">1. Choose a date</label>
                <input
                  id="booking-date"
                  type="date"
                  min={localDateString(new Date())}
                  value={bookingDate}
                  onChange={(event) => {
                    const selected = event.target.value;
                    if (selected < localDateString(new Date())) {
                      toast.error("Past dates are not available.");
                      return;
                    }
                    setBookingDate(selected);
                    setBookingTime(null);
                    setBookingStaff("");
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 sm:max-w-xs"
                />
              </div>

              <div>
                <p className="mb-1.5 block text-sm font-semibold text-slate-800">Service</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="font-semibold text-slate-900">{bookingService.name}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {bookingService.duration} minutes · {bookingService.price === null ? "Price not set" : `R${bookingService.price}`}
                  </p>
                </div>
              </div>

              {provider.kind === "BUSINESS" && (
                <div>
                  <label htmlFor="booking-staff" className="mb-1.5 block text-sm font-semibold text-slate-800">Choose a staff member</label>
                  <select
                    id="booking-staff"
                    value={bookingStaff}
                    onChange={(event) => {
                      setBookingStaff(event.target.value);
                      setBookingTime(null);
                    }}
                    disabled={availabilityLoading || !bookingAvailability || bookingAvailability.staff.length === 0}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">{availabilityLoading ? "Loading assigned staff..." : bookingAvailability?.staff.length ? "Select an assigned staff member" : "No verified staff assigned to this service"}</option>
                    {(bookingAvailability?.staff ?? []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">Times load after you choose a staff member.</p>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">Choose a time</h3>
                  <span className="text-xs text-slate-500">Starts every {bookingService.duration} minutes</span>
                </div>
                {availabilityLoading ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" role="status">Loading live availability...</p>
                ) : availabilityError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{availabilityError}</p>
                ) : provider.kind === "BUSINESS" && !bookingStaff ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Select an assigned staff member to load their available times.</p>
                ) : (bookingAvailability?.slots.length ?? 0) === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No available times fit this provider&apos;s hours on the selected date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {bookingAvailability?.slots.map((slot) => {
                      const available = slot.status === "AVAILABLE";
                      return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        disabled={!available}
                        aria-pressed={bookingTime === slot.startsAt}
                        onClick={() => setBookingTime(slot.startsAt)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          !available
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                            : bookingTime === slot.startsAt
                              ? "border-sky-700 bg-sky-700 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-sky-600 hover:text-sky-700"
                        }`}
                      >
                        {formatBookingDate(new Date(slot.startsAt))}
                        {!available && <span className="mt-0.5 block text-[10px] font-medium">Booked</span>}
                      </button>
                    );})}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">Booked times are based on current appointments. The server checks availability again when you book.</p>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setBookingService(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBookingSubmit()}
                disabled={bookingTime === null || bookingSubmitting || (provider.kind === "BUSINESS" && !bookingStaff)}
                className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bookingSubmitting ? "Booking..." : "Book appointment"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {signInOpen && bookingService && !authLoading && user?.role !== "CUSTOMER" && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !signInSubmitting) {
              setSignInOpen(false);
              setSignInError(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-sign-in-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase text-sky-700">Almost there</p>
                <h2 id="booking-sign-in-title" className="mt-1 font-[Clash_Display] text-2xl font-bold text-slate-950">
                  Sign in to book
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Your selection is saved: {bookingService.name}{bookingTime ? ` at ${formatBookingDate(new Date(bookingTime))}` : ""}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSignInOpen(false);
                  setSignInError(null);
                }}
                disabled={signInSubmitting}
                aria-label="Close sign in"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="m18 6-12 12M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form onSubmit={handleSignInSubmit} className="space-y-4 p-5 sm:p-6">
              {signInError && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {signInError}
                </p>
              )}
              <div>
                <label htmlFor="booking-sign-in-email" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Email address
                </label>
                <input
                  id="booking-sign-in-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={signInEmail}
                  onChange={(event) => setSignInEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label htmlFor="booking-sign-in-password" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="booking-sign-in-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <button
                type="submit"
                disabled={signInSubmitting || bookingSubmitting}
                className="w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signInSubmitting ? "Signing in..." : "Sign in"}
              </button>
              <p className="text-center text-sm text-slate-600">
                New here? <Link to="/register/customer" onClick={() => setSignInOpen(false)} className="font-semibold text-sky-700 hover:underline">Create a customer account</Link>
              </p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
