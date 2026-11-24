import { useState, type FormEvent } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<{ success: boolean; user: NonNullable<typeof user> }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || null,
          phone: form.phone.trim() || null,
        }),
      });
      updateUser(response.user);
      setNotice("Your profile has been updated.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Your profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-sky-700">ACCOUNT SETTINGS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">My profile</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your administrator account details.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      <form onSubmit={saveProfile} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input
              required
              maxLength={50}
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Last name
            <input
              maxLength={80}
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Phone number
            <input
              type="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email address
            <input type="email" value={user?.email ?? ""} readOnly aria-readonly="true" className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Email changes require verification and aren’t available here.</span>
          </label>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
