import { safeCustomerReturnPath } from "../../../lib/bookingFlow";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a13.2 13.2 0 0 1-3.4 4.06M6.1 6.1C3.6 7.8 2 10 1 12c0 0 3 6 9.4 6.9" />
    </svg>
  );
}

function getPasswordChecks(password: string) {
  return [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /\d/.test(password) },
    { label: "One special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function CustomerRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const passwordChecks = getPasswordChecks(form.password);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnTo = new URLSearchParams(location.search).get("returnTo");
  const safeReturnTo = safeCustomerReturnPath(requestedReturnTo);

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!passwordChecks.every((check) => check.passed)) {
      toast.error("Password does not meet all requirements.");
      return;
    }

    if (!form.agree) {
      toast.error("Please accept the terms and privacy policy.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/auth/register/customer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Registration failed");
        return;
      }

      toast.success("Check your email for a verification code.");
      navigate("/verify-email", {
        replace: true,
        state: {
          email:
            data.email ?? data.user?.email ?? form.email.trim().toLowerCase(),
          emailSent: data.emailSent !== false,
          ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
        },
      });
    } catch (error) {
      console.error("Registration request failed:", error);
      toast.error("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:outline-none focus:ring-4 focus:ring-sky-100";

  return (
    <section className="h-screen overflow-hidden bg-[#F8FAFC] text-slate-800">
      <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-6 lg:px-8 lg:py-8">
        <Link
          to="/register"
          className="mb-4 inline-flex w-fit shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          Back To Account Types
        </Link>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <aside className="hidden h-full flex-col justify-center rounded-3xl bg-[#0F172A] p-7 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.8)] lg:flex">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Customer
            </div>

            <h1 className="mt-6 font-[Clash_Display] text-4xl font-bold tracking-tight">
              Book your first appointment
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Create a free account to discover providers, view availability, and keep every booking in one clear place.
            </p>

            <div className="mt-8 space-y-3">
              {["Browse available providers", "Book in a few clicks", "Manage bookings and reminders"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#38BDF8] text-xs font-bold text-[#0F172A]">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_-18px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="mb-4 shrink-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "#0EA5E9" }}>
                Create account
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#0F172A] sm:text-3xl">
                Welcome aboard
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Full Names"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="email@example.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+27 82 000 0000"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>

                  {form.password.length > 0 && (
                    <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {passwordChecks.map((check) => (
                        <li
                          key={check.label}
                          className={`flex items-center gap-1.5 text-xs ${check.passed ? "text-emerald-600" : "text-slate-400"
                            }`}
                        >
                          <span>{check.passed ? "✓" : "○"}</span>
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputClass}
                  />

                  {form.confirmPassword.length > 0 && (
                    <p
                      className={`mt-1.5 text-xs ${passwordsMatch ? "text-emerald-600" : "text-red-500"
                        }`}
                    >
                      {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    required
                    checked={form.agree}
                    onChange={(e) => update("agree", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                  />
                  <span>I agree to the Terms of Service and Privacy Policy.</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full rounded-xl bg-[#0EA5E9] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(14,165,233,0)] transition-all duration-200 hover:bg-[#38BDF8] hover:shadow-[0_0_24px_-4px_rgba(14,165,233,0.55)] disabled:cursor-not-allowed disabled:bg-sky-300 disabled:shadow-none`}
                >
                  {isSubmitting ? "Creating account..." : "Create customer account"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[#0F172A] underline decoration-sky-300 underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
