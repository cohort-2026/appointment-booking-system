import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const savedProfile = {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  };
  const [form, setForm] = useState<ProfileForm>(savedProfile);

  function startEditing() {
    setForm(savedProfile);
    setNotice(null);
    setEditing(true);
  }

  const name = user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Customer";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  function cancelEditing() {
    setError(null);
    setNotice(null);
    setEditing(false);
  }

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
      setEditing(false);
      setNotice("Your profile has been updated.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Your profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: "First name", value: user?.firstName || "Not provided" },
    { label: "Last name", value: user?.lastName || "Not provided" },
    { label: "Email address", value: user?.email || "Not provided" },
    { label: "Phone number", value: user?.phone || "Not provided" },
  ];

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-sky-700">ACCOUNT SETTINGS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">My profile</h1><p className="mt-2 text-sm text-slate-500">Your personal details and account information.</p></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-xl font-bold text-white">{initials || "C"}</span><div><h2 className="text-xl font-bold">{name}</h2><p className="mt-1 text-sm text-slate-500">Customer account</p></div></div>
        {!editing && <button type="button" onClick={startEditing} className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">Edit profile</button>}
      </div>
      {editing ? (
        <form onSubmit={saveProfile} className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">First name
              <input required maxLength={50} value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">Last name
              <input maxLength={80} value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">Phone number
              <input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">Email address
              <input type="email" value={user?.email ?? ""} readOnly aria-describedby="email-note" className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500" />
              <span id="email-note" className="mt-1 block text-xs font-normal text-slate-500">Email changes require verification and aren’t available here.</span>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" disabled={saving} onClick={cancelEditing} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-x-8 sm:grid-cols-2">{fields.map((field) => <div key={field.label} className="border-b border-slate-100 px-6 py-5 last:border-0 sm:[&:nth-last-child(2)]:border-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{field.label}</p><p className="mt-2 break-words text-sm font-medium text-slate-800">{field.value}</p></div>)}</div>
      )}
    </section>
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Need to change your password?</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Request a password reset to update your sign-in credentials.</p></div><Link to="/forgot-password" className="inline-flex w-fit shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700">Reset password</Link></section>
  </div>;
}
