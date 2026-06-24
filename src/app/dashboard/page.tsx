import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { orders } from "@/lib/mock-data";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <div>
        <div className="text-sm font-medium text-slate-400">{label}</div>
        <div className="mt-2 text-[28px] font-bold leading-none text-slate-900">
          {value}
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm font-semibold text-brand-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
        </svg>
        +52%
      </div>
    </div>
  );
}

function RiderCell({ rider }: { rider: string | null }) {
  if (!rider) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-brand-500 hover:text-brand-600"
        title="Assign rider"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      </button>
    );
  }
  const initials = rider
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div
      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white ring-2 ring-white"
      title={rider}
    >
      {initials}
    </div>
  );
}

export default function DashboardOverview() {
  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled"
  );

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="space-y-6 px-8 pb-10">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard label="Total Orders" value="3,478" />
          <StatCard label="Customers" value="14,368" />
          <StatCard label="Active Orders" value="825" />
        </div>

        {/* Active orders table */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Active Orders</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                825
              </span>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                placeholder="Search here..."
                className="w-72 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Business Name</th>
                  <th className="px-3 py-3 font-medium">Business Name</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Riders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeOrders.map((o, i) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{i + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-11 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-lg">
                          {o.itemEmoji}
                        </div>
                        <span className="font-medium text-slate-900">{o.item}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                          {o.businessShort}
                        </div>
                        <span className="text-slate-700">{o.business}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 font-medium text-slate-900">Rs. {o.price}</td>
                    <td className="px-3 py-4 text-slate-500">{o.contact}</td>
                    <td className="px-3 py-4 text-slate-500">{o.location}</td>
                    <td className="px-3 py-4 text-slate-500">{o.date}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-4">
                      <RiderCell rider={o.rider} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
