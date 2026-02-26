import { useRef } from "react";

const SLOTS = [
  { key: "nir",   label: "NIR",   accent: "#e0457b", note: "Near Infrared" },
  { key: "red",   label: "Red",   accent: "#e07845", note: "Canal Rojo"    },
  { key: "green", label: "Green", accent: "#45c07a", note: "Canal Verde"   },
];

export default function TiffModal({
  tiffFiles,  setTiffFiles,
  tiffWarnings, setTiffWarnings,
  modalDragOver, setModalDragOver,
  extractBase, validateFile, autoAssignDrop,
  onClose, onSubmit,
}) {
  const nirInputRef   = useRef(null);
  const redInputRef   = useRef(null);
  const greenInputRef = useRef(null);
  const refMap = { nir: nirInputRef, red: redInputRef, green: greenInputRef };

  const bases    = [tiffFiles.nir, tiffFiles.red, tiffFiles.green].filter(Boolean).map(extractBase);
  const mismatch = bases.length === 3 && new Set(bases).size > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="flex flex-col gap-5 bg-stone-900 border-2 border-yellow-600 shadow-[8px_8px_0_#1a130a] p-5 w-[680px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setModalDragOver(true); }}
        onDragLeave={() => setModalDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setModalDragOver(false); autoAssignDrop(e.dataTransfer.files); }}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans font-bold text-sm uppercase tracking-widest text-amber-200">
              Cargar Bandas PixelWrench2
            </p>
            <p className="font-sans text-[10px] text-stone-400 uppercase tracking-wider mt-1">
              {modalDragOver
                ? "📥 Suelta los 3 TIFFs — se asignan automáticamente por nombre"
                : "Selecciona cada TIFF · o arrastra los 3 a la vez para auto-asignar"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-amber-200 transition-colors ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Formato esperado */}
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-800/60 border border-stone-700/60">
          <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
          </svg>
          <p className="font-mono text-[10px] text-stone-400 leading-relaxed">
            Formato esperado:&nbsp;
            <span className="text-amber-300/80">NombreBase</span>
            <span className="text-stone-500">_nir.tif &nbsp;·&nbsp;</span>
            <span className="text-amber-300/80">NombreBase</span>
            <span className="text-stone-500">_red.tif &nbsp;·&nbsp;</span>
            <span className="text-amber-300/80">NombreBase</span>
            <span className="text-stone-500">_green.tif</span>
            <span className="text-stone-500"> &nbsp;—&nbsp; la parte antes del primer&nbsp;</span>
            <span className="text-amber-300/80">_</span>
            <span className="text-stone-500">&nbsp;debe coincidir en los 3 archivos.</span>
          </p>
        </div>

        {/* Coherencia de nombre base */}
        {mismatch && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/50">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <p className="font-sans text-[10px] text-red-300">
              ⚠ Los archivos no comparten el mismo nombre base — pueden ser de imágenes distintas.
            </p>
          </div>
        )}

        {/* Band slots */}
        <div className="flex gap-3">
          {SLOTS.map(({ key, label, accent, note }) => (
            <div
              key={key}
              className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed py-6 px-3 cursor-pointer transition-all"
              style={{
                borderColor: tiffWarnings[key] ? "#f87171" : tiffFiles[key] ? accent : "#44403c",
                background:  tiffWarnings[key] ? "#7f1d1d22" : tiffFiles[key] ? `${accent}12` : "transparent",
              }}
              onClick={() => refMap[key].current?.click()}>

              <input
                ref={refMap[key]}
                type="file"
                accept=".tif,.tiff"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) {
                    setTiffFiles(prev => ({ ...prev, [key]: f }));
                    validateFile(key, f);
                  }
                  e.target.value = "";
                }} />

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                style={{ borderColor: accent, color: accent, background: tiffFiles[key] ? `${accent}22` : "transparent" }}>
                {tiffFiles[key]
                  ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
              </div>

              <p className="font-sans font-bold text-sm uppercase tracking-widest" style={{ color: accent }}>{label}</p>
              <p className="font-sans text-[9px] uppercase tracking-wider text-stone-500">{note}</p>
              <p className="font-sans text-[10px] text-center leading-tight break-all" style={{ color: tiffFiles[key] ? "#d6d3d1" : "#78716c" }}>
                {tiffFiles[key] ? tiffFiles[key].name : "Click para seleccionar"}
              </p>
              {tiffWarnings[key] && (
                <p className="font-sans text-[9px] text-red-400 text-center leading-tight">
                  ⚠ El nombre no contiene "{label}" — ¿seguro que es la banda correcta?
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end border-t border-stone-700 pt-4">
          <button
            onClick={() => { onClose(); setTiffFiles({ nir: null, red: null, green: null }); }}
            className="px-4 py-2 border border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-400 font-sans text-xs uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button
            disabled={!tiffFiles.nir || !tiffFiles.red || !tiffFiles.green}
            onClick={() => onSubmit(tiffFiles.nir, tiffFiles.red, tiffFiles.green)}
            className="flex items-center gap-2 px-5 py-2 border-2 font-sans font-semibold text-xs uppercase tracking-widest transition-all border-yellow-500/70 bg-yellow-600/30 hover:bg-yellow-500/45 text-yellow-200 disabled:opacity-30 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Procesar Bandas
          </button>
        </div>
      </div>
    </div>
  );
}
