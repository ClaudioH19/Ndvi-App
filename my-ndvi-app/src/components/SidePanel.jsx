const VIEW_OPTS = [
  { key: "cir",  label: "CIR",  sub: "NIR · Red · Green", grad: "linear-gradient(to right, #ff2288, #44cc88)" },
  { key: "ndvi", label: "NDVI", sub: "Escala de grises",   grad: "linear-gradient(to right, #000, #fff)" },
];

const LABEL_STYLE = {
  "Cielo":        { bg: "bg-sky-100",      text: "text-sky-700",      dot: "bg-sky-400"      },
  "Planta":       { bg: "bg-emerald-100",  text: "text-emerald-800",  dot: "bg-emerald-500"  },
  "Maleza":       { bg: "bg-amber-100",    text: "text-amber-800",    dot: "bg-amber-500"    },
  "Sombra/Suelo": { bg: "bg-stone-200",    text: "text-stone-600",    dot: "bg-stone-400"    },
  "Desconocido":  { bg: "bg-red-100",      text: "text-red-600",      dot: "bg-red-400"      },
};

export default function SidePanel({ fileNames, view, switchView, hasMasked, selectedClusters, clusterLabels }) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-3 p-4 bg-amber-100/60 border-l-2 border-yellow-600/30 overflow-y-auto">

      {/* Archivo */}
      <div className="bg-white/60 border border-stone-200 border-l-4 border-l-yellow-500 p-3">
        <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-2">Archivos</p>
        {fileNames && [
          { key: "nir",   label: "NIR",   color: "text-pink-600"   },
          { key: "red",   label: "Red",   color: "text-orange-600" },
          { key: "green", label: "Green", color: "text-emerald-600" },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-baseline gap-1.5 mb-1 last:mb-0">
            <span className={`font-sans font-bold text-[9px] uppercase tracking-widest shrink-0 ${color}`}>{label}</span>
            <span className="font-sans text-[10px] text-stone-600 break-all leading-tight">{fileNames[key]}</span>
          </div>
        ))}
      </div>

      {/* Vista */}
      <div className="bg-white/60 border border-stone-200 border-l-4 border-l-yellow-400 p-3">
        <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-2">Vista</p>
        <div className="flex flex-col gap-1.5">
          {VIEW_OPTS.map(({ key, label, sub, grad }) => (
            <button
              key={key}
              onClick={() => switchView(key)}
              className={`flex items-center gap-2 px-2 py-1.5 border text-left transition-all
                ${view === key ? "border-stone-300 bg-white/90" : "border-stone-100 bg-transparent opacity-50"}`}>
              <div className="w-3 h-10 rounded-sm flex-shrink-0" style={{ background: grad }} />
              <div>
                <p className="font-sans font-bold text-xs text-stone-700">{label}</p>
                <p className="font-sans text-[9px] text-stone-400 uppercase tracking-wider">{sub}</p>
              </div>
              {view === key && <span className="ml-auto text-green-700 text-xs">✓</span>}
            </button>
          ))}

          {hasMasked && (
            <button
              onClick={() => switchView("ndvi_masked")}
              className={`flex items-center gap-2 px-2 py-1.5 border text-left transition-all
                ${view === "ndvi_masked" ? "border-stone-300 bg-white/90" : "border-stone-100 bg-transparent opacity-50"}`}>
              <div
                className="w-3 h-10 rounded-sm flex-shrink-0"
                style={{ background: "linear-gradient(to bottom, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,97), rgb(253,231,36))" }}
              />
              <div>
                <p className="font-sans font-bold text-xs text-stone-700">Masked</p>
                <p className="font-sans text-[9px] text-stone-400 uppercase tracking-wider">Viridis</p>
              </div>
              {view === "ndvi_masked" && <span className="ml-auto text-green-700 text-xs">✓</span>}
            </button>
          )}
        </div>
      </div>

      {/* Etiquetas de clusters */}
      {clusterLabels && (
        <div className="bg-white/60 border border-stone-200 border-l-4 border-l-fuchsia-500 p-3">
          <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-2">Etiquetas de Cluster</p>
          <div className="flex flex-col gap-1.5">
            {clusterLabels.map((label, i) => {
              const s = LABEL_STYLE[label] ?? LABEL_STYLE["Sombra/Suelo"];
              const active = selectedClusters.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1 rounded-sm transition-all
                    ${active ? "ring-1 ring-fuchsia-400 bg-fuchsia-50/60" : "opacity-60"}`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                  <span className="font-sans font-bold text-[10px] text-stone-500 w-5">C{i + 1}</span>
                  <span className={`font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}



    </div>
  );
}
