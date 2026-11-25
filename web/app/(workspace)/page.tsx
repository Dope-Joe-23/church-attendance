const trend = [
  { label: "Sep 6", value: 58 },
  { label: "Sep 13", value: 67 },
  { label: "Sep 20", value: 61 },
  { label: "Sep 27", value: 76 },
  { label: "Oct 4", value: 72 },
  { label: "Oct 11", value: 88 },
  { label: "Oct 18", value: 82 },
];
const chartPoints = trend.map((point, index) => `${40 + index * 100},${178 - point.value * 1.55}`).join(" ");

const metrics = [
  { label: "Total members", value: "248", change: "+12 this month", tone: "text-indigo-700", icon: "♙" },
  { label: "Average attendance", value: "76%", change: "+4.2% vs last month", tone: "text-emerald-700", icon: "↗" },
  { label: "This week", value: "184", change: "Across 2 services", tone: "text-violet-700", icon: "◷" },
  { label: "New visitors", value: "9", change: "Last 30 days", tone: "text-amber-700", icon: "✳" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Sunday, October 18, 2026</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Good morning</h1>
          <p className="mt-1 text-slate-500">Here&apos;s a snapshot of your church community.</p>
        </div>
        <span className="w-fit rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">Demo dashboard</span>
      </div>

      <div role="note" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
        This attendance trend and these summary figures are sample data for the UI preview, not live church records.
      </div>

      <section aria-label="Community summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <span aria-hidden="true" className={`grid size-9 place-items-center rounded-xl bg-slate-50 text-lg ${metric.tone}`}>{metric.icon}</span>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p>
            <p className="mt-1 text-xs font-medium text-emerald-700">{metric.change}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Attendance trend</h2>
              <p className="mt-1 text-sm text-slate-500">Weekly check-ins · sample data</p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">↑ 18% over 7 weeks</span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <svg
              viewBox="0 0 680 225"
              role="img"
              aria-label="Demo line chart showing weekly attendance rising from 58 to 82 across seven weeks"
              className="h-56 min-w-[560px] w-full"
            >
              {[45, 90, 135, 180].map((y) => <line key={y} x1="35" x2="665" y1={y} y2={y} stroke="#e9edf5" strokeDasharray="4 6" />)}
              <polyline points={chartPoints} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {trend.map((point, index) => {
                const x = 40 + index * 100;
                const y = 178 - point.value * 1.55;
                return (
                  <g key={point.label}>
                    <circle cx={x} cy={y} r="5" fill="white" stroke="#4f46e5" strokeWidth="3" />
                    <text x={x} y="215" textAnchor="middle" fill="#64748b" fontSize="11">{point.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <h2 className="font-bold text-slate-900">This Sunday</h2>
            <p className="mt-1 text-sm text-slate-500">Upcoming gathering · demo content</p>
          </div>
          <div className="mt-5 rounded-xl bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sunday service</p>
            <p className="mt-2 text-lg font-bold text-slate-900">Worship &amp; fellowship</p>
            <p className="mt-1 text-sm text-slate-600">10:00 AM · Main sanctuary</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Expected members</span><span className="font-semibold text-slate-800">—</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Check-in status</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Not connected</span></div>
          </div>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Service schedule and attendance forecasts are not currently supplied by the API.</p>
        </article>
      </section>
    </div>
  );
}
