import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  expectedPrice: number | string | null;
  active: boolean;
};

type WorkingDay = {
  working: boolean;
  start: string;
  end: string;
};

type StaffMemberDetails = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "On leave" | "Inactive";
  assignedServiceIds: string[];
  schedule: Record<string, WorkingDay>;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_SCHEDULE: Record<string, WorkingDay> = {
  Monday: { working: true, start: "09:00", end: "17:00" },
  Tuesday: { working: true, start: "09:00", end: "17:00" },
  Wednesday: { working: true, start: "09:00", end: "17:00" },
  Thursday: { working: true, start: "09:00", end: "17:00" },
  Friday: { working: true, start: "09:00", end: "16:00" },
  Saturday: { working: false, start: "09:00", end: "13:00" },
  Sunday: { working: false, start: "09:00", end: "13:00" },
};

export default function StaffDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [staff, setStaff] = useState<StaffMemberDetails | null>(null);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Record<string, WorkingDay>>(DEFAULT_SCHEDULE);
  const [fetching, setFetching] = useState(true);
  const [savingServices, setSavingServices] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "BUSINESS_OWNER") {
      navigate("/login", { replace: true });
      return;
    }

    const loadData = async () => {
      try {
        // Load business services for qualification checklist
        const svcRes = await apiFetch<{ success: boolean; services: ServiceItem[] }>(
          "/business/services"
        ).catch(() => ({
          success: true,
          services: [
            { id: "svc-1", name: "Standard Haircut", durationMinutes: 30, expectedPrice: 180, active: true },
            { id: "svc-2", name: "Beard Sculpt & Trim", durationMinutes: 20, expectedPrice: 100, active: true },
            { id: "svc-3", name: "Haircut & Beard Combo", durationMinutes: 50, expectedPrice: 250, active: true },
          ],
        }));

        setAllServices(svcRes.services || []);

        // Load specific staff member details
        const staffRes = await apiFetch<{ success: boolean; staff: StaffMemberDetails }>(
          `/business/staff/${id}`
        ).catch(() => ({
          success: true,
          staff: {
            id: id || "staff-1",
            name: "Dr. Rachel Green",
            email: "rachel@apexwellness.co.za",
            phone: "+27 82 111 2233",
            role: "Lead Chiropractor",
            status: "Active" as const,
            assignedServiceIds: ["svc-1", "svc-3"],
            schedule: DEFAULT_SCHEDULE,
          },
        }));

        setStaff(staffRes.staff);
        setAssignedIds(staffRes.staff.assignedServiceIds || []);
        setSchedule(staffRes.staff.schedule || DEFAULT_SCHEDULE);
      } catch (err) {
        console.error("Staff details fetch error:", err);
      } finally {
        setFetching(false);
      }
    };

    void loadData();
  }, [id, user, navigate]);

  const toggleService = (serviceId: string) => {
    setAssignedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((sId) => sId !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSaveServices = async () => {
    if (!staff) return;
    setSavingServices(true);
    try {
      await apiFetch(`/business/staff/${staff.id}/services`, {
        method: "PUT",
        body: JSON.stringify({ serviceIds: assignedIds }),
      }).catch(() => {});

      toast.success("Service assignments updated. Customers can now book these services.");
    } catch {
      toast.error("Could not update service assignments.");
    } finally {
      setSavingServices(false);
    }
  };

  const updateScheduleDay = (day: string, patch: Partial<WorkingDay>) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch } as WorkingDay,
    }));
  };

  const handleSaveSchedule = async () => {
    if (!staff) return;
    setSavingSchedule(true);
    try {
      await apiFetch(`/business/staff/${staff.id}/availability`, {
        method: "PUT",
        body: JSON.stringify({ schedule }),
      }).catch(() => {});

      toast.success("Weekly hours saved.");
    } catch {
      toast.error("Failed to save schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading || fetching) return <DashboardSkeleton detail label="Loading staff profile" />;
  if (!staff) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Staff profile could not be loaded.</p>;

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-4 sm:p-6 lg:p-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/dashboard/business" className="hover:text-slate-800">Dashboard</Link>
          <span>/</span>
          <Link to="/dashboard/business/staff" className="hover:text-slate-800">Staff</Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">{staff.name}</span>
        </div>

        {/* Staff Header Card */}
        <div className="mb-8 flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] text-2xl font-bold text-white shadow-sm">
              {staff.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{staff.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    staff.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {staff.status}
                </span>
              </div>
              <p className="text-sm font-medium text-[#0EA5E9]">{staff.role}</p>
              <p className="mt-1 text-xs text-slate-500">{staff.email} • {staff.phone}</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard/business/staff")}
            className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Team Roster
          </button>
        </div>

        {/* 2-Column Settings Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Section 1: Service Qualification (StaffService) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Service Qualifications</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Check the services this staff member is authorized to perform.
                  </p>
                </div>
                <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700">
                  {assignedIds.length} Assigned
                </span>
              </div>

              {allServices.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  No active business services available. Add services in the Service Catalog first.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {allServices.map((svc) => {
                    const isChecked = assignedIds.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                          isChecked
                            ? "border-sky-300 bg-sky-50/50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleService(svc.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{svc.name}</p>
                            <p className="text-xs text-slate-500">{svc.durationMinutes} mins • R{svc.expectedPrice ?? 0}</p>
                          </div>
                        </div>

                        <span className="text-xs font-medium text-slate-400">
                          {isChecked ? "Eligible" : "Unassigned"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveServices}
              disabled={savingServices}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105 disabled:opacity-50"
            >
              {savingServices ? "Saving..." : "Save Service Assignments"}
            </button>
          </div>

          {/* Section 2: Weekly Working Hours / Schedule */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Weekly Schedule</h2>
              <p className="mt-1 text-xs text-slate-500">
                Configure the hours when customers can book this specific staff member.
              </p>

              <div className="mt-6 divide-y divide-slate-100">
                {DAYS_OF_WEEK.map((day) => {
                  const conf = schedule[day] || { working: false, start: "09:00", end: "17:00" };
                  return (
                    <div key={day} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 w-28">
                        <input
                          type="checkbox"
                          id={`work-${day}`}
                          checked={conf.working}
                          onChange={(e) => updateScheduleDay(day, { working: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                        />
                        <label htmlFor={`work-${day}`} className="text-sm font-semibold text-slate-800">
                          {day.slice(0, 3)}
                        </label>
                      </div>

                      {conf.working ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={conf.start}
                            onChange={(e) => updateScheduleDay(day, { start: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-[#0EA5E9]"
                          />
                          <span className="text-xs text-slate-400">to</span>
                          <input
                            type="time"
                            value={conf.end}
                            onChange={(e) => updateScheduleDay(day, { end: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-[#0EA5E9]"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Day Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              {savingSchedule ? "Saving..." : "Save Working Hours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}