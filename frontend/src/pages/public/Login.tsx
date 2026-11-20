import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { getVerificationEmail } from "../../services/auth";
import { postLoginDestination, safeCustomerReturnPath } from "../../lib/bookingFlow";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading: authLoading } = useAuth();
  const requestedReturnTo = new URLSearchParams(location.search).get("returnTo");
  const safeReturnTo = safeCustomerReturnPath(requestedReturnTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    try {
      const user = await login(email, password);

      toast.success("Signed in successfully!");

      const destination = postLoginDestination(user, safeReturnTo);
      if (destination) navigate(destination, { replace: true });
      else toast.error("Your account has an unsupported role.");
    } catch (error) {
      const unverifiedEmail = getVerificationEmail(error);

      if (unverifiedEmail) {
        const emailSent =
          (error as { data?: { emailSent?: boolean } } | null)?.data?.emailSent !== false;

        toast(
          emailSent
            ? "Please verify your email to continue. We've sent you a code."
            : "We couldn't send your code. You can retry from the verification page.",
        );
        navigate("/verify-email", {
          state: { email: unverifiedEmail, emailSent, ...(safeReturnTo ? { returnTo: safeReturnTo } : {}) },
        });
        return;
      }

      console.error("Login request failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to connect to the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;
  const activeSessionDestination = user ? postLoginDestination(user, safeReturnTo) : null;
  if (activeSessionDestination) {
    return <Navigate to={activeSessionDestination} replace />;
  }

    return (
    <section className="relative h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(14,165,233,0.12) 0%, rgba(248,250,252,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#0EA5E9]/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#38BDF8]/10 blur-[100px]"
      />

      <div className="relative flex h-full items-center justify-center px-6 py-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
            {/* Header band, inside the card */}
            <div className="relative border-b border-slate-100 bg-gradient-to-b from-[#F8FBFF] to-white px-8 pb-4 pt-5">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0EA5E9] via-[#38BDF8] to-[#0EA5E9]"
              />

              <div className="flex items-center justify-center gap-3">
                <Link to="/" className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] font-[Clash_Display] text-sm font-bold text-[#0F172A] shadow-[0_8px_20px_-6px_rgba(14,165,233,0.55)]">
                    IT
                  </div>

                  <span className="font-[Clash_Display] text-lg font-extrabold tracking-tight">
                    <span className="text-[#0F172A]">ITThynk</span>
                    <span className="text-[#0EA5E9]">Appoint</span>
                  </span>
                </Link>
              </div>

              <h1 className="mt-3 text-center font-[Clash_Display] text-xl font-bold leading-tight tracking-tight text-[#0F172A]">
                Welcome back
              </h1>

              <p className="mx-auto mt-1 max-w-[280px] text-center text-xs leading-5 text-slate-500">
                Sign in to manage your appointments, services, or business.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-6 pt-5 sm:px-9">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#0F172A]"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-[#334155] outline-none transition placeholder:text-slate-400 focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-[#0F172A]"
                    >
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-[#0EA5E9] transition-colors hover:text-sky-700"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-12 text-sm text-[#334155] outline-none transition placeholder:text-slate-400 focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0EA5E9]"
                    >
                      {showPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.4 5.3A9.9 9.9 0 0 1 12 5c5 0 9 4 10 7a12.5 12.5 0 0 1-3.1 4.1M6.2 6.2A12.7 12.7 0 0 0 2 12c1 3 5 7 10 7a9.7 9.7 0 0 0 3.4-.6" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>


                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(14,165,233,0.65)] transition-all duration-200 hover:shadow-[0_14px_36px_-6px_rgba(14,165,233,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                <p className="text-sm text-slate-500">
                  Don't have an account?{" "}
                  <Link
                    to={safeReturnTo ? `/register/customer?returnTo=${encodeURIComponent(safeReturnTo)}` : "/register"}
                    className="font-semibold text-[#0EA5E9] hover:text-sky-700"
                  >
                    Get started
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
