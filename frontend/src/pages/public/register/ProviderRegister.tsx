import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ACCENT = "#0F766E";
const ACCENT_SOFT = "#CCFBF1";

const CATEGORIES = [
  "Hair & Beauty",
  "Health & Wellness",
  "Fitness & Coaching",
  "Home Services",
  "Tutoring & Lessons",
  "Other",
];

const EXPERIENCE = ["Just starting out", "1–3 years", "4–9 years", "10+ years"];

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

export default function ProviderRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    serviceName: "",
    email: "",
    phone: "",
    city: "",
    category: "",
    experience: "",
    bio: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const navigate = useNavigate();
  const passwordChecks = getPasswordChecks(form.password);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!passwordChecks.every((check) => check.passed)) {
      toast.error("Password does not meet all requirements.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!form.category) {
      toast.error("Please select a service category.");
      return;
    }

    if (!/^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(form.fullName.trim())) {
      toast.error("Enter a valid full name.");
      return;
    }

    if (!form.serviceName.trim() || form.serviceName.trim().length > 100) {
      toast.error("Enter a service name of 1 to 100 characters.");
      return;
    }

    if (!/^[\p{L}\p{M}][\p{L}\p{M} .,'-]{1,99}$/u.test(form.city.trim())) {
      toast.error("Enter a valid city or service area, not an email address.");
      return;
    }

    if (!form.experience) {
      toast.error("Please select your years of experience.");
      return;
    }

    if (form.bio.trim().length > 500) {
      toast.error("Your bio must be 500 characters or fewer.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/auth/register/provider",
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
        toast.error(data.message || "Provider registration failed.");
        return;
      }

      toast.success("Check your email for a verification code.");
      navigate("/verify-email", {
        replace: true,
        state: {
          email:
            data.email ?? data.user?.email ?? form.email.trim().toLowerCase(),
          emailSent: data.emailSent !== false,
        },
      });
    } catch (error) {
      console.error("Provider registration request failed:", error);

      toast.error("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0F766E] focus:outline-none focus:ring-4 focus:ring-teal-100";

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
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
              Independent Provider
            </div>

            <h1 className="mt-6 font-[Clash_Display] text-4xl font-bold tracking-tight">
              Put your services on the calendar
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Set up your provider profile so customers can find you, see what you offer, and book directly into your schedule.
            </p>

            <div className="mt-8 space-y-3">
              {["Create your public provider profile", "Manage your own services and hours", "Track every customer booking"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2DD4BF] text-xs font-bold text-[#0F172A]">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_-18px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="mb-4 shrink-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                Create account
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#0F172A] sm:text-3xl">
                Set up your provider profile
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      maxLength={100}
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Full Names"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="serviceName" className="text-sm font-medium text-slate-700">
                      Business / service name
                    </label>
                    <input
                      id="serviceName"
                      name="serviceName"
                      type="text"
                      required
                      autoComplete="organization"
                      maxLength={100}
                      value={form.serviceName}
                      onChange={(e) => update("serviceName", e.target.value)}
                      placeholder="Business Name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="businessname@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      maxLength={20}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+27 82 000 0000"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-slate-700">Service category</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => {
                      const active = form.category === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => update("category", category)}
                          className="rounded-full border px-3.5 py-1.5 text-sm transition-colors"
                          style={{
                            borderColor: active ? ACCENT : "#E2E8F0",
                            backgroundColor: active ? ACCENT_SOFT : "#FFFFFF",
                            color: active ? ACCENT : "#475569",
                          }}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="text-sm font-medium text-slate-700">
                      City / area you serve
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      required
                      autoComplete="address-level2"
                      maxLength={100}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Pretoria, Gauteng"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="experience" className="text-sm font-medium text-slate-700">
                      Years of experience
                    </label>
                    <select
                      id="experience"
                      name="experience"
                      required
                      value={form.experience}
                      onChange={(e) => update("experience", e.target.value)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select an option
                      </option>
                      {EXPERIENCE.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="text-sm font-medium text-slate-700">
                    Tell customers what you do
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={2}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    placeholder="A short line about your services and specialties."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-800">Basic — Free</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Your account starts on Basic. No payment details are required.
                    Paid upgrades are not available yet.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
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
                      <ul className="mt-2 space-y-0.5">
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
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
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
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    required
                    checked={form.agree}
                    onChange={(e) => update("agree", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>I agree to the Terms of Service, Provider Agreement, and Privacy Policy.</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(15,118,110,0)] transition-all duration-200 ${isSubmitting
                    ? "cursor-not-allowed bg-teal-400 opacity-70"
                    : "bg-[#0F766E] hover:bg-[#14B8A6] hover:shadow-[0_0_24px_-4px_rgba(15,118,110,0.5)]"
                    }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account...
                    </span>
                  ) : (
                    "Create provider account"
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[#0F172A] underline decoration-teal-300 underline-offset-4">
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