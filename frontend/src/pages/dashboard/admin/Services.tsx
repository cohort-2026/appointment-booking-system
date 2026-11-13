// import { useState } from "react";

// type Service = {
//   id: string;
//   name: string;
//   durationMinutes: number;
//   providers: string[];
//   active: boolean;
// };

// // Temporary list. Later this will come from the providers API.
// const allProviders = [
//   "Amanda Cele",
//   "Kabelo Maseko",
//   "Lerato Nkosi",
//   "Naledi Khumalo",
// ];

// const mockServices: Service[] = [
//   {
//     id: "1",
//     name: "Massage",
//     durationMinutes: 60,
//     providers: ["Amanda Cele"],
//     active: true,
//   },
//   {
//     id: "2",
//     name: "Haircut",
//     durationMinutes: 30,
//     providers: ["Kabelo Maseko"],
//     active: true,
//   },
//   {
//     id: "3",
//     name: "Dental check-up",
//     durationMinutes: 45,
//     providers: ["Lerato Nkosi"],
//     active: true,
//   },
//   {
//     id: "4",
//     name: "Physiotherapy",
//     durationMinutes: 60,
//     providers: [],
//     active: false,
//   },
// ];

// const inputClass =
//   "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

// export default function Services() {
//   const [services, setServices] = useState<Service[]>(mockServices);
//   const [name, setName] = useState("");
//   const [duration, setDuration] = useState("30");
//   const [error, setError] = useState("");
//   const [managingId, setManagingId] = useState<string | null>(null);

//   const managingService =
//     services.find((s) => s.id === managingId) ?? null;

//   const addService = (e: React.FormEvent) => {
//     e.preventDefault();

//     const minutes = Number(duration);
//     if (name.trim() === "") {
//       setError("Please enter a service name.");
//       return;
//     }
//     if (!Number.isFinite(minutes) || minutes <= 0) {
//       setError("Duration must be a number greater than 0.");
//       return;
//     }

//     const newService: Service = {
//       id: String(Date.now()),
//       name: name.trim(),
//       durationMinutes: minutes,
//       providers: [],
//       active: true,
//     };

//     setServices((current) => [...current, newService]);
//     setName("");
//     setDuration("30");
//     setError("");
//   };

//   const toggleActive = (id: string) => {
//     setServices((current) =>
//       current.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
//     );
//   };

//   const toggleProvider = (serviceId: string, providerName: string) => {
//     setServices((current) =>
//       current.map((s) => {
//         if (s.id !== serviceId) return s;

//         const alreadyAssigned = s.providers.includes(providerName);
//         return {
//           ...s,
//           providers: alreadyAssigned
//             ? s.providers.filter((p) => p !== providerName)
//             : [...s.providers, providerName],
//         };
//       })
//     );
//   };

//   return (
//     <section>
//       <div className="mb-6">
//         <h2 className="text-xl font-bold tracking-tight">Services</h2>
//         <p className="mt-1 text-sm text-slate-500">
//           Manage the services customers can book.
//         </p>
//       </div>

//       {/* Add service */}
//       <form
//         onSubmit={addService}
//         className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
//       >
//         <h3 className="mb-3 font-semibold">Add a service</h3>

//         <div className="flex flex-col gap-3 sm:flex-row">
//           <input
//             type="text"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="Service name"
//             className={`${inputClass} w-full sm:max-w-xs`}
//           />

//           <input
//             type="number"
//             value={duration}
//             onChange={(e) => setDuration(e.target.value)}
//             placeholder="Minutes"
//             className={`${inputClass} w-full sm:w-32`}
//           />

//           <button
//             type="submit"
//             className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
//           >
//             Add service
//           </button>
//         </div>

//         {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
//       </form>

//       {/* Assign providers panel */}
//       {managingService && (
//         <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
//           <div className="mb-3 flex items-center justify-between">
//             <h3 className="font-semibold">
//               Providers for {managingService.name}
//             </h3>
//             <button
//               type="button"
//               onClick={() => setManagingId(null)}
//               className="text-sm font-semibold text-slate-600 hover:underline"
//             >
//               Done
//             </button>
//           </div>

//           <div className="grid gap-2 sm:grid-cols-2">
//             {allProviders.map((provider) => (
//               <label
//                 key={provider}
//                 className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm"
//               >
//                 <input
//                   type="checkbox"
//                   checked={managingService.providers.includes(provider)}
//                   onChange={() => toggleProvider(managingService.id, provider)}
//                 />
//                 {provider}
//               </label>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Table */}
//       <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
//         <table className="w-full text-left text-sm">
//           <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
//             <tr>
//               <th className="px-5 py-3 font-semibold">Service</th>
//               <th className="px-5 py-3 font-semibold">Duration</th>
//               <th className="px-5 py-3 font-semibold">Providers</th>
//               <th className="px-5 py-3 font-semibold">Status</th>
//               <th className="px-5 py-3 text-right font-semibold">Actions</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-100">
//             {services.map((s) => (
//               <tr key={s.id}>
//                 <td className="px-5 py-4 font-semibold">{s.name}</td>
//                 <td className="px-5 py-4 text-slate-700">
//                   {s.durationMinutes} min
//                 </td>
//                 <td className="px-5 py-4 text-slate-700">
//                   {s.providers.length > 0
//                     ? s.providers.join(", ")
//                     : "None assigned"}
//                 </td>
//                 <td className="px-5 py-4">
//                   <span
//                     className={`rounded-full px-3 py-1 text-xs font-semibold ${
//                       s.active
//                         ? "bg-emerald-50 text-emerald-700"
//                         : "bg-slate-100 text-slate-600"
//                     }`}
//                   >
//                     {s.active ? "Active" : "Inactive"}
//                   </span>
//                 </td>
//                 <td className="px-5 py-4 text-right">
//                   <button
//                     type="button"
//                     onClick={() => setManagingId(s.id)}
//                     className="mr-3 text-sm font-semibold text-sky-600 hover:underline"
//                   >
//                     Providers
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => toggleActive(s.id)}
//                     className="text-sm font-semibold text-slate-600 hover:underline"
//                   >
//                     {s.active ? "Deactivate" : "Activate"}
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// }