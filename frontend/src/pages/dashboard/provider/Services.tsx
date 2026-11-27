import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../../services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number; bufferAfterMinutes: number;
  expectedPrice: number | string | null;
  active: boolean;
};

type ServicesResponse = { success: boolean; services: Service[] };
type ServiceForm = { name: string; description: string; durationMinutes: number; bufferAfterMinutes: number; expectedPrice: string };
const EMPTY_FORM: ServiceForm = { name: "", description: "", durationMinutes: 30, bufferAfterMinutes: 15, expectedPrice: "" };

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState<ServiceForm>(EMPTY_FORM);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<ServicesResponse>("/provider/services")
      .then((response) => {
        if (active) {
          setServices(response.services ?? []);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        console.error("Provider services fetch failed:", error);
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load services.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const handleAddService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/provider/services", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          durationMinutes: formData.durationMinutes,
          bufferAfterMinutes: formData.bufferAfterMinutes,
          expectedPrice: formData.expectedPrice === "" ? null : Number(formData.expectedPrice),
        }),
      });
      toast.success("Service added successfully.");
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("Provider service creation failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to add service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes ?? 15,
      expectedPrice: service.expectedPrice === null ? "" : String(service.expectedPrice),
    });
    setIsModalOpen(true);
  };

  const handleUpdateService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingService) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/provider/services/${editingService.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          durationMinutes: formData.durationMinutes,
          bufferAfterMinutes: formData.bufferAfterMinutes,
          expectedPrice: formData.expectedPrice === "" ? null : Number(formData.expectedPrice),
        }),
      });
      toast.success("Service updated.");
      setIsModalOpen(false);
      setEditingService(null);
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await apiFetch(`/provider/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !service.active }),
      });
      toast.success(service.active ? "Service paused." : "Service activated.");
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update service status.");
    }
  };

  const handleDelete = async (service: Service) => {
    if (!window.confirm(`Delete ${service.name}? If it has booking history, it will be paused instead to preserve records.`)) return;
    try {
      const response = await apiFetch<{ action: "deleted" | "deactivated" }>(`/provider/services/${service.id}`, { method: "DELETE" });
      toast.success(response.action === "deactivated" ? "Service deactivated." : "Service deleted.");
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("Provider service removal failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to remove service.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Services</h1>
          <p className="mt-1 text-slate-500">Manage services customers can book.</p>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-105" style={{ background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})` }}>
          Add service
        </button>
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
        <div className="h-1.5 bg-primary" />
        <div className="border-b border-slate-100 bg-sky-50/50 px-5 py-4"><h2 className="font-semibold text-slate-900">Your services</h2>{!isLoading && !loadError && <p className="mt-1 text-sm text-slate-500">{services.length} {services.length === 1 ? "service" : "services"}</p>}</div>
        {isLoading ? (
          <div className="divide-y divide-slate-100 p-5" role="status" aria-label="Loading services">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex animate-pulse items-center justify-between gap-5 py-5"><div className="w-full space-y-3"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="h-3 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/4 rounded bg-slate-100" /></div><div className="h-8 w-20 rounded bg-slate-100" /></div>)}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center" role="alert"><p className="text-sm text-red-700">Services could not be loaded: {loadError}</p><button type="button" onClick={() => { setIsLoading(true); setReloadKey((key) => key + 1); }} className="mt-3 text-sm font-semibold text-sky-700 hover:underline">Retry</button></div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center"><h2 className="font-semibold text-slate-900">No services yet</h2><p className="mt-2 text-sm text-slate-500">Add a service to make it available for future bookings.</p></div>
        ) : (
          <div className="space-y-3 p-5">
            {services.map((service) => <div key={service.id} className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition hover:border-sky-200 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold text-slate-900">{service.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{service.active ? "Active" : "Paused"}</span></div><p className="mt-1 text-sm text-slate-500">{service.description || "No description provided."}</p><div className="mt-2 flex flex-wrap gap-4 text-sm font-medium text-slate-600"><span>{service.durationMinutes} mins + {service.bufferAfterMinutes ?? 15} mins cleanup</span><span>{service.expectedPrice === null ? "Price not set" : `R${Number(service.expectedPrice).toFixed(2)} expected`}</span></div></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={`Actions for ${service.name}`} title="Service actions" className="self-start bg-white sm:self-center"><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => openEditService(service)}><Pencil aria-hidden="true" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void handleToggleActive(service)}>{service.active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{service.active ? "Pause" : "Resume"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => void handleDelete(service)}><Trash2 aria-hidden="true" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>)}
          </div>
        )}
      </Card>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <section className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">{editingService ? "Edit service" : "Add service"}</h2><button type="button" aria-label="Close" onClick={() => { setIsModalOpen(false); setEditingService(null); setFormData(EMPTY_FORM); }} className="rounded p-2 text-slate-500 hover:bg-slate-100">×</button></header>
          <form onSubmit={editingService ? handleUpdateService : handleAddService} className="space-y-4 p-5">
            <label className="block text-sm font-medium text-slate-700">Service name<input required maxLength={100} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-slate-700">Description (optional)<textarea maxLength={1000} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} /></label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">Cleanup after service (minutes)<input required type="number" min={15} max={1440} value={formData.bufferAfterMinutes} onChange={(event) => setFormData({ ...formData, bufferAfterMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-medium text-slate-700">Duration (minutes)<input required type="number" min={1} max={1440} value={formData.durationMinutes} onChange={(event) => setFormData({ ...formData, durationMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-medium text-slate-700">Expected price (R)<input type="number" min={0} step="0.01" value={formData.expectedPrice} onChange={(event) => setFormData({ ...formData, expectedPrice: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs text-slate-500">Optional and informational only.</span></label>
            </div>
            <footer className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => { setIsModalOpen(false); setEditingService(null); setFormData(EMPTY_FORM); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})` }}>{isSubmitting ? "Saving..." : editingService ? "Save changes" : "Save service"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
