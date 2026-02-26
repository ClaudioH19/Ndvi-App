export default function StatsCard({ stats }) {
  if (!stats) return null;

  const cv    = stats.coefficient_of_variation * 100;
  const cvPct = Math.min(100, (stats.coefficient_of_variation / 0.3) * 100);

  const rows = [
    { label: "Promedio", value: stats.average.toFixed(3),  color: "text-emerald-700" },
    { label: "Desv Est", value: stats.std_dev.toFixed(3),  color: "text-teal-700"    },
    { label: "CV",       value: `${cv.toFixed(1)}%`,       color: "text-lime-700"    },
  ];

  return (
    <div className="w-52 shrink-0 self-start mt-10 mx-1 flex flex-col gap-0 bg-white/70 border border-stone-200 border-l-4 border-l-emerald-500 shadow-sm">

      {/* Header */}
      <div className="px-3 py-1.5 bg-emerald-600/10 border-b border-stone-200">
        <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-emerald-800">
          Stats NDVI
        </p>
      </div>

      {/* Metrics */}
      {rows.map(({ label, value, color }) => (
        <div key={label} className="px-3 py-2 border-b border-stone-100 last:border-0">
          <p className="font-sans text-[8px] uppercase tracking-widest text-stone-400 mb-0.5">{label}</p>
          <p className={`font-mono font-bold text-sm leading-none ${color}`}>{value}</p>
        </div>
      ))}

      {/* CV bar */}
      <div className="px-3 pb-3">
        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${cvPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
