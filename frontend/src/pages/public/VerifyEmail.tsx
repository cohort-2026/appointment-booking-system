import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { resendEmailOtp } from "../../services/auth";
import { createAppointment } from "../../services/bookings";
import { finishVerifiedBooking, safeCustomerReturnPath } from "../../lib/bookingFlow";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const verificationState = location.state as
    | { email?: string; emailSent?: boolean; returnTo?: string }
    | null;
  const email = verificationState?.email ?? "";
  const emailSent = verificationState?.emailSent !== false;

  const submitting = useRef(false);
  const safeReturnTo = safeCustomerReturnPath(verificationState?.returnTo);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    emailSent ? RESEND_COOLDOWN_SECONDS : 0,
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(
      () => setSecondsLeft((current) => current - 1),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  if (!email) {
    return <Navigate to={safeReturnTo ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}` : "/login"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);

    try {
      const user = await verifyEmail(email, code);
      const outcome = await finishVerifiedBooking(user, safeReturnTo, createAppointment);
      navigate(outcome.destination, { replace: true, state: { bookingNotice: outcome.message } });
      if (outcome.error) toast.error(outcome.message);
      else toast.success(outcome.message);
    } catch (error) {
      console.error("Email verification failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to connect to the server.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);

    try {
      await resendEmailOtp(email);
      toast.success("A new code has been sent.");
      setCode("");
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error("Resend code failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to connect to the server.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-6 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(14,165,233,0.12) 0%, rgba(248,250,252,0) 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.28)]">
          <div className="relative border-b border-slate-100 bg-gradient-to-b from-[#F8FBFF] to-white px-8 pb-5 pt-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0EA5E9] via-[#38BDF8] to-[#0EA5E9]"
            />
            <h1 className="mt-2 text-center font-[Clash_Display] text-2xl font-bold leading-tight text-[#0F172A]">
              Verify your email
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-slate-500">
              {emailSent ? "We sent a 6-digit code to " : "We couldn't send a code to "}
              <span className="font-semibold text-[#0F172A]">{email}</span>
              {emailSent ? ". It expires in 10 minutes." : ". You can retry below."}
            </p>
          </div>

          <div className="px-8 pb-7 pt-6 sm:px-9">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-[#0F172A]">
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] text-[#334155] outline-none transition placeholder:text-slate-300 focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(14,165,233,0.45)] transition hover:shadow-[0_14px_36px_-6px_rgba(14,165,233,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify email"}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <p className="text-sm text-slate-500">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || secondsLeft > 0}
                  className="font-semibold text-[#0EA5E9] hover:text-sky-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {resending
                    ? "Sending..."
                    : secondsLeft > 0
                      ? `Resend in ${secondsLeft}s`
                      : "Resend code"}
                </button>
              </p>
              <p className="mt-3 text-sm text-slate-500">
                <Link
                  to={safeReturnTo ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}` : "/login"}
                  className="font-semibold text-[#0F172A] underline decoration-sky-300 underline-offset-4"
                >
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
