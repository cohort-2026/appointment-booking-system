import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { Card } from "@/components/ui/card";

type ProfileForm = {
  displayName: string;
  serviceName: string;
  category: string;
  experience: string;
  city: string;
  bio: string;
};

type ProviderProfile = NonNullable<ReturnType<typeof useAuth>["user"]>["soleProvider"];

const categories = [
  "Hair & Beauty",
  "Health & Wellness",
  "Fitness & Coaching",
  "Home Services",
  "Tutoring & Lessons",
  "Other",
];

const experienceOptions = ["Just starting out", "1–3 years", "4–9 years", "10+ years"];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile>(user?.soleProvider ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<ProfileForm>({
    displayName: user?.soleProvider?.displayName ?? "",
    serviceName: profile?.serviceName ?? "",
    category: profile?.category ?? "",
    experience: profile?.experience ?? "",
    city: profile?.city ?? "",
    bio: profile?.bio ?? "",
  });

  useEffect(() => {
    let active = true;
    void apiFetch<{ success: boolean; profile: NonNullable<ProviderProfile> }>("/provider/profile")
      .then(({ profile: currentProfile }) => {
        if (!active) return;
        setProfile(currentProfile);
        setForm({
          displayName: currentProfile.displayName,
          serviceName: currentProfile.serviceName ?? "",
          category: currentProfile.category ?? "",
          experience: currentProfile.experience ?? "",
          city: currentProfile.city ?? "",
          bio: currentProfile.bio ?? "",
        });
      })
      .catch((error: unknown) => {
        console.error("Provider profile fetch failed:", error);
        if (active) toast.error(error instanceof Error ? error.message : "Unable to load provider profile.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse" role="status" aria-label="Loading provider profile">
        <div className="mb-8 h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-5 rounded bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Provider profile details are not available.
      </div>
    );
  }

  const fields = [
    { label: "Name", value: profile.displayName },
    { label: "Email", value: user.email },
    { label: "Phone", value: user.phone },
    { label: "Service", value: profile.serviceName },
    { label: "Category", value: profile.category },
    { label: "Experience", value: profile.experience },
    { label: "City or service area", value: profile.city },
  ];

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cancelEdit = () => {
    setForm({
      displayName: profile?.displayName ?? "",
      serviceName: profile.serviceName ?? "",
      category: profile.category ?? "",
      experience: profile.experience ?? "",
      city: profile.city ?? "",
      bio: profile.bio ?? "",
    });
    setIsEditing(false);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await apiFetch<{ success: boolean; profile: NonNullable<ProviderProfile> }>("/provider/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setProfile(response.profile);
      await refreshUser();
      toast.success("Profile updated.");
      setIsEditing(false);
    } catch (error) {
      console.error("Provider profile update failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
          <p className="mt-1 text-slate-500">Review your account and public provider details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          
          {isEditing ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
        <div className="h-1.5 bg-primary" />
        <div className="border-b border-slate-100 bg-sky-50/50 p-6">
          <h2 className="font-semibold text-slate-900">Provider information</h2>
        </div>
        {isEditing ? (
          <form onSubmit={saveProfile} className="space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Display name
                <input
                  required
                  maxLength={100}
                  value={form.displayName}
                  onChange={(event) => updateForm("displayName", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email
                <input type="email" value={user.email} readOnly aria-readonly="true" className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Service
                <input
                  required
                  maxLength={100}
                  value={form.serviceName}
                  onChange={(event) => updateForm("serviceName", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  required
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Years of experience
                <select
                  required
                  value={form.experience}
                  onChange={(event) => updateForm("experience", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select experience</option>
                  {experienceOptions.map((experience) => (
                    <option key={experience} value={experience}>{experience}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                City or service area
                <input
                  required
                  maxLength={100}
                  value={form.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                About
                <textarea
                  maxLength={500}
                  rows={4}
                  value={form.bio}
                  onChange={(event) => updateForm("bio", event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2">
            {fields.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-1 font-medium text-slate-900">{value || "Not provided"}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500">About</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium text-slate-900">
                {profile.bio || "Not provided"}
              </dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}
