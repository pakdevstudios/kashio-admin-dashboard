const styles: Record<string, { wrap: string; dot: string }> = {
  Processing: { wrap: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  Pending: { wrap: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  "Ready To Pick": { wrap: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  "On The Way": { wrap: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  Delivered: { wrap: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  Cancelled: { wrap: "bg-red-50 text-red-600", dot: "bg-red-500" },
  Online: { wrap: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  Active: { wrap: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  "On Delivery": { wrap: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  Offline: { wrap: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  Inactive: { wrap: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  Suspended: { wrap: "bg-red-50 text-red-600", dot: "bg-red-500" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = styles[status] ?? { wrap: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
