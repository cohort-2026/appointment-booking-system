import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, Phone } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";

type ProfileForm = { firstName: string; lastName: string; phone: string };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: user?.phone ?? "" });

  const name = user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Customer";
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "C";

  function startEditing() {
    setForm({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: user?.phone ?? "" });
    setError(null); setNotice(null); setEditing(true);
  }

  function cancelEditing() {
    setForm({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: user?.phone ?? "" });
    setError(null); setNotice(null); setEditing(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null);
    try {
      const response = await apiFetch<{ success: boolean; user: NonNullable<typeof user> }>("/customer/profile", {
        method: "PATCH", body: JSON.stringify({ firstName: form.firstName.trim(), lastName: form.lastName.trim() || null, phone: form.phone.trim() || null }),
      });
      updateUser(response.user); setEditing(false); setNotice("Your profile has been updated.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Your profile could not be updated.");
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Account settings</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">My profile</h1><p className="mt-1 text-sm text-slate-500">Your personal details and account information.</p></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

    <Card className="overflow-hidden rounded-2xl border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14 rounded-2xl after:rounded-2xl" size="lg"><AvatarFallback className="rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-bold text-white">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0"><CardTitle className="truncate text-lg">{name}</CardTitle><div className="mt-1 flex items-center gap-2">{user?.email && <span className="hidden truncate text-xs text-slate-500 sm:inline">{user.email}</span>}</div></div>
        </div>
        {!editing && <Button onClick={startEditing} className="w-full sm:w-auto">Edit profile</Button>}
      </CardHeader>

      {editing ? <form onSubmit={saveProfile}>
        <CardContent className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-xs font-medium text-slate-800">First name<Input required maxLength={100} autoComplete="given-name" value={form.firstName} onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))} className="mt-1.5 h-9 text-xs" /></label>
          <label className="text-xs font-medium text-slate-800">Last name<Input maxLength={100} autoComplete="family-name" value={form.lastName} onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))} className="mt-1.5 h-9 text-xs" /></label>
          <label className="text-xs font-medium text-slate-800">Phone<Input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} className="mt-1.5 h-9 text-xs" /></label>
          <div className="text-xs font-medium text-slate-800">Password<Link to="/forgot-password" className="mt-1.5 flex h-9 items-center justify-between rounded-lg border border-input px-3 font-normal text-slate-600 transition hover:border-sky-300 hover:text-sky-700"><span>Change password</span><KeyRound className="size-3.5" /></Link></div>
        </CardContent>
        <Separator />
        <div className="flex justify-end gap-2 bg-slate-50/70 px-5 py-3 sm:px-6"><Button type="button" variant="outline" size="sm" disabled={saving} onClick={cancelEditing}>Discard</Button><Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
      </form> : <CardContent className="grid gap-x-8 px-5 py-2 sm:grid-cols-2 sm:px-6">
        <div className="border-b border-slate-100 py-4 sm:py-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First name</p><p className="mt-1.5 text-sm font-medium text-slate-900">{user?.firstName || "Not provided"}</p></div>
        <div className="border-b border-slate-100 py-4 sm:py-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last name</p><p className="mt-1.5 text-sm font-medium text-slate-900">{user?.lastName || "Not provided"}</p></div>
        <div className="border-b border-slate-100 py-4 sm:border-b-0 sm:py-5"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Mail className="size-3"/>Email address</div><p className="mt-1.5 break-all text-sm font-medium text-slate-900">{user?.email || "Not provided"}</p></div>
        <div className="py-4 sm:py-5"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Phone className="size-3"/>Phone number</div><p className="mt-1.5 text-sm font-medium text-slate-900">{user?.phone || "Not provided"}</p></div>
      </CardContent>}
    </Card>

    {!editing && <Card className="rounded-2xl border-0 shadow-sm ring-1 ring-slate-200">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-sm font-semibold text-slate-900">Need to change your password?</h2><p className="mt-1 text-xs leading-5 text-slate-500">Request a password reset to update your sign-in credentials.</p></div><Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/forgot-password">Reset password</Link></Button></CardContent>
    </Card>}
  </div>;
}
