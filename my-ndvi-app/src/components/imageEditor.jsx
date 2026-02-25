import { useState, useRef, useCallback } from "react";
import { RAW_W, RAW_H, buildCIR, buildNDVI, buildCIRMasked, buildNDVIMasked, renderToCanvas, displaySize, VIRIDIS } from "../hooks/useImageHelpers";
import useSubmitTiffs from "../hooks/useSubmitTiffs";
import useProcessClusters from "../hooks/useProcessClusters";
import useSaveMask from "../hooks/useSaveMask";

const NUM_CLUSTERS = 6;
const CLUSTER_COLOR = [135, 206, 235, 120];


/* ── Sentinel: backend usa -9999/9999 para NA/Inf ── */
const isSentinel = (v) => v == null || isNaN(v) || v >= 9000 || v <= -9000;

/* ── UI pieces ─────────────────────────────────────────── */
function Btn({ onClick, disabled, variant = "white", children }) {
  const v = {
    white:  "border-white/25 bg-white/10 hover:bg-white/20 hover:border-yellow-300 text-amber-100",
    green:  "border-green-400/50 bg-green-700/25 hover:bg-green-600/40 text-green-200",
    yellow: "border-yellow-500/70 bg-yellow-600/30 hover:bg-yellow-500/45 text-yellow-200",
    ghost:  "border-white/10 bg-transparent hover:bg-white/10 text-amber-200/50 hover:text-amber-100",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 border-2 font-sans font-semibold text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${v}`}>
      {children}
    </button>
  );
}

/* ── Main ──────────────────────────────────────────────── */
export default function RawMaskEditor() {
  const [ready, setReady]                       = useState(false);
  const [status, setStatus]                     = useState("Sin archivo cargado");
  const [fileName, setFileName]                 = useState("");
  const [selectedClusters, setSelectedClusters] = useState(new Set());
  const [dims, setDims]                         = useState({ dw: 0, dh: 0 });
  const [view, setView]                         = useState("cir");
  const [stats, setStats]                       = useState(null);
  const [tiffModalOpen, setTiffModalOpen]       = useState(false);
  const [tiffFiles, setTiffFiles]               = useState({ nir: null, red: null, green: null });

  const dataRef       = useRef(null);
  const classifiedRef = useRef(null);
  const imgCanvasRef  = useRef(null);
  const maskCanvasRef = useRef(null);
  const nirInputRef   = useRef(null);
  const redInputRef   = useRef(null);
  const greenInputRef = useRef(null);

  const { submitTiffs, loading }                 = useSubmitTiffs();
  const { processClusters, loading: processing } = useProcessClusters();
  const { saveMask: saveMaskApi, loading: saving } = useSaveMask();

  const saveMask = useCallback(async () => {
    const d = dataRef.current;
    if (!d?.ndvi_masked) return;
    const name = fileName.replace(/\.[^.]+$/, "") || "mask";
    const result = await saveMaskApi(d.ndvi_masked, name);
    if (result) setStatus(`✓ Máscara guardada: ${result.filename}`);
    else        setStatus("⚠ Error al guardar máscara");
  }, [fileName, saveMaskApi]);

  /* ── Switch view ── */
  const switchView = useCallback((v) => {
    setView(v);
    const d = dataRef.current;
    if (!d) return;
    const { dw, dh } = displaySize();
    const maskC = maskCanvasRef.current;

    if (v === "ndvi_masked") {
      const ndviMasked = d.ndvi_masked;
      if (!ndviMasked) return;
      let min = Infinity, max = -Infinity;
      for (const row of ndviMasked)
        for (const v of row)
          if (!isSentinel(v)) { if (v < min) min = v; if (v > max) max = v; }
      const range = max - min || 1;
      const canvas = imgCanvasRef.current;
      const ctx    = canvas.getContext("2d");
      const id     = ctx.createImageData(dw, dh);
      const scaleX = RAW_W / dw, scaleY = RAW_H / dh;
      for (let dy = 0; dy < dh; dy++) {
        const srcRow = ndviMasked[Math.floor(dy * scaleY)];
        for (let dx = 0; dx < dw; dx++) {
          const val = srcRow?.[Math.floor(dx * scaleX)];
          const i   = (dy * dw + dx) * 4;
          if (isSentinel(val)) {
            id.data[i]=8; id.data[i+1]=8; id.data[i+2]=12; id.data[i+3]=220;
          } else {
            const t         = Math.max(0, Math.min(1, (val - min) / range));
            const [r, g, b] = VIRIDIS[Math.min(255, Math.floor(t * 255))];
            id.data[i]=r; id.data[i+1]=g; id.data[i+2]=b; id.data[i+3]=255;
          }
        }
      }
      ctx.putImageData(id, 0, 0);
      if (maskC) maskC.getContext("2d").clearRect(0, 0, dw, dh);
      return;
    }

    const mask = d.ndvi_masked ?? null;
    let pixels;
    if (v === "cir") pixels = mask ? buildCIRMasked(d.nir, d.red, d.green, mask) : buildCIR(d.nir, d.red, d.green);
    else             pixels = mask ? buildNDVIMasked(d.ndvi, mask)                 : buildNDVI(d.ndvi);
    renderToCanvas(imgCanvasRef.current, pixels, dw, dh);
    if (maskC) maskC.getContext("2d").clearRect(0, 0, dw, dh);
  }, []);

  /* ── Redraw cluster mask ── */
  const redrawMask = useCallback((active, dw, dh) => {
    const maskC = maskCanvasRef.current;
    const cls   = classifiedRef.current;
    if (!maskC || !cls) return;
    const scaleX = RAW_W / dw, scaleY = RAW_H / dh;
    const ctx = maskC.getContext("2d");
    const id  = ctx.createImageData(dw, dh);
    const [r, g, b, a] = CLUSTER_COLOR;
    for (let dy = 0; dy < dh; dy++)
      for (let dx = 0; dx < dw; dx++) {
        const c = cls[Math.floor(dy * scaleY)]?.[Math.floor(dx * scaleX)];
        if (c != null && !isNaN(c) && active.has(c)) {
          const i = (dy * dw + dx) * 4;
          id.data[i]=r; id.data[i+1]=g; id.data[i+2]=b; id.data[i+3]=a;
        }
      }
    ctx.putImageData(id, 0, 0);
  }, []);

  const toggleCluster = useCallback((c) => {
    setSelectedClusters((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      const { dw, dh } = displaySize();
      redrawMask(next, dw, dh);
      return next;
    });
  }, [redrawMask]);

  const handleClick = useCallback((e) => {
    const cls   = classifiedRef.current;
    const maskC = maskCanvasRef.current;
    if (!cls || !maskC) return;
    const rect = maskC.getBoundingClientRect();
    const dx = Math.floor((e.clientX - rect.left) * (dims.dw / rect.width));
    const dy = Math.floor((e.clientY - rect.top)  * (dims.dh / rect.height));
    const c  = cls[Math.floor(dy * RAW_H / dims.dh)]?.[Math.floor(dx * RAW_W / dims.dw)];
    if (c != null && !isNaN(c)) toggleCluster(c);
  }, [dims, toggleCluster]);

  const handleUndo = useCallback(() => {
    setSelectedClusters((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(Array.from(prev).slice(0, -1));
      const { dw, dh } = displaySize();
      redrawMask(next, dw, dh);
      return next;
    });
  }, [redrawMask]);

  /* ── Upload ── */
  const handleFiles = useCallback(async (nirFile, redFile, greenFile) => {
    if (!nirFile || !redFile || !greenFile) return;
    setTiffModalOpen(false);
    setReady(false); setStatus("Enviando bandas TIFF…");
    setFileName(`NIR: ${nirFile.name}`);
    setSelectedClusters(new Set()); setStats(null);
    const data = await submitTiffs(nirFile, redFile, greenFile);
    if (!data) { setStatus("⚠ Error al enviar archivos"); return; }
    const { ndvi, classified, nir, red, green } = data;
    if (!nir || !red || !green) { setStatus("⚠ El backend no retorna nir/red/green"); return; }
    dataRef.current       = { ndvi, nir, red, green };  // ndvi_masked se limpia al cargar nueva imagen
    classifiedRef.current = classified;
    const { dw, dh } = displaySize();
    renderToCanvas(imgCanvasRef.current, buildCIR(nir, red, green), dw, dh);
    const maskC = maskCanvasRef.current;
    maskC.width = dw; maskC.height = dh;
    maskC.getContext("2d").clearRect(0, 0, dw, dh);
    setView("cir"); setDims({ dw, dh }); setReady(true);
    setStatus("✓ Imagen cargada — selecciona clusters y presiona Procesar");
    setTiffFiles({ nir: null, red: null, green: null });
  }, [submitTiffs]);

  /* ── Procesar ── */
  const handleProcess = useCallback(async () => {
    const d   = dataRef.current;
    const cls = classifiedRef.current;
    if (!d || !cls || selectedClusters.size === 0) return;
    setStatus("Procesando clusters seleccionados…");
    const selectedList = Array.from(selectedClusters);

    // Equivalente a: np.where(np.isin(labels, selected_labels), ndvi, np.nan)
    // El frontend hace la selección (antes la hacía clasificate_pixels en Python)
    // y manda al backend el NDVI con null donde el cluster no fue seleccionado.
    const ndviClasificado = cls.map((row, ry) =>
      row.map((label, rx) =>
        selectedClusters.has(label) ? d.ndvi[ry][rx] : null
      )
    );

    const result = await processClusters(ndviClasificado, selectedList, d.ndvi);
    if (result) {
      const { ndvi_masked, stats_ndvi } = result;
      dataRef.current = { ...dataRef.current, ndvi_masked };
      switchView("ndvi_masked");
      setStats(stats_ndvi);
      setStatus(`✓ Procesado — clusters: ${selectedList.map(c => c + 1).join(", ")}`);
    } else {
      setStatus("⚠ Error al procesar clusters");
    }
  }, [processClusters, selectedClusters, switchView]);

  /* ── Botón principal ── */
  const mainBtn = !ready
    ? {
        label: "Cargar TIFFs", onClick: () => setTiffModalOpen(true),
        disabled: loading, variant: "white",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        ),
      }
    : {
        label: processing ? "Procesando…" : "Procesar",
        onClick: handleProcess,
        disabled: selectedClusters.size === 0 || processing,
        variant: "yellow",
        icon: processing
          ? <div className="w-4 h-4 rounded-full border-2 border-yellow-300 border-t-transparent animate-spin" />
          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>,
      };

  const viewLabel = {
    cir:         "CIR — NIR→R · Red→G · Green→B",
    ndvi:        "NDVI — escala de grises",
    ndvi_masked: "NDVI Masked — viridis · resultado del proceso",
  }[view] ?? view;

  return (
    <div className="flex flex-col w-full min-h-screen bg-amber-50">

      {/* Toolbar */}
      <div className="w-full bg-gradient-to-r from-green-900 to-stone-800 border-b-4 border-yellow-600 px-6 py-3 flex items-center gap-3">

        <Btn onClick={mainBtn.onClick} disabled={mainBtn.disabled} variant={mainBtn.variant}>
          {mainBtn.icon}{mainBtn.label}
        </Btn>

        <div className="w-px h-7 bg-white/20" />

        <Btn onClick={saveMask} disabled={!stats || saving} variant="green">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          {saving ? "Guardando…" : "Guardar Máscara"}
        </Btn>

        <div className="ml-auto">
          <Btn onClick={handleUndo} disabled={selectedClusters.size === 0} variant="ghost">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 7v6h6"/><path d="M3 13C5 8 10 5 15 5a9 9 0 010 18c-4 0-7.5-2-9-5"/>
            </svg>
            Deshacer
          </Btn>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 w-full overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col p-5 overflow-auto">

          {!ready && !loading && (
            <div className="flex-1 border-2 border-dashed border-yellow-500 hover:border-green-600 bg-yellow-50/40
                            hover:bg-green-50/30 flex flex-col items-center justify-center cursor-pointer transition-all min-h-96 relative"
              onClick={() => setTiffModalOpen(true)}
              onDragOver={(e) => e.preventDefault()}>
              <div className="absolute inset-3 border border-dashed border-yellow-400/25 pointer-events-none" />
              <svg width="56" height="56" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-35">
                <line x1="40" y1="75" x2="40" y2="10" stroke="#c8a84b" strokeWidth="2"/>
                <ellipse cx="40" cy="12" rx="5" ry="10" fill="#c8a84b"/>
                <ellipse cx="31" cy="22" rx="4" ry="8" fill="#7fb84e" transform="rotate(-20 31 22)"/>
                <ellipse cx="49" cy="22" rx="4" ry="8" fill="#7fb84e" transform="rotate(20 49 22)"/>
                <ellipse cx="27" cy="34" rx="4" ry="8" fill="#5a8a3c" transform="rotate(-25 27 34)"/>
                <ellipse cx="53" cy="34" rx="4" ry="8" fill="#5a8a3c" transform="rotate(25 53 34)"/>
              </svg>
              <p className="font-sans font-bold text-sm uppercase tracking-widest text-stone-500 mb-1">Cargar bandas PixelWrench2</p>
              <p className="font-sans text-xs text-stone-400">NIR · Red · Green — TIFF individuales</p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-96">
              <div className="w-9 h-9 rounded-full border-4 border-stone-300 border-t-green-600 animate-spin" />
              <p className="font-sans text-xs uppercase tracking-widest text-stone-400">{status}</p>
            </div>
          )}

          <div style={{ display: ready && !loading ? "block" : "none" }}>
            <p className="font-sans text-[11px] uppercase tracking-widest text-stone-400 mb-2">
              {viewLabel} · click para activar cluster
            </p>
            <div className="relative inline-block border-2 border-yellow-600 shadow-[5px_5px_0_#4a3f28] overflow-hidden cursor-crosshair"
              style={{ width: dims.dw, height: dims.dh, maxWidth: "100%" }}
              onClick={handleClick}>
              <span className="absolute top-1.5 left-2 z-10 font-sans text-[9px] tracking-[.2em] uppercase text-yellow-300/60 pointer-events-none select-none">
                {RAW_W}×{RAW_H}
              </span>
              <canvas ref={imgCanvasRef}  className="absolute inset-0 z-0" />
              <canvas ref={maskCanvasRef} className="absolute inset-0 z-10" />
              <canvas width={dims.dw || 1} height={dims.dh || 1} className="relative z-20 opacity-0 block" />
            </div>
          </div>
        </div>

        {/* Side panel */}
        {ready && !loading && (
          <div className="w-48 flex-shrink-0 flex flex-col gap-3 p-4 bg-amber-100/60 border-l-2 border-yellow-600/30 overflow-y-auto">

            <div className="bg-white/60 border border-stone-200 border-l-4 border-l-yellow-500 p-3">
              <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-1">Archivo</p>
              <p className="font-sans font-semibold text-xs text-stone-700 break-all">{fileName}</p>
            </div>

            <div className="bg-white/60 border border-stone-200 border-l-4 border-l-yellow-400 p-3">
              <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-2">Vista</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { key: "cir",  label: "CIR",  sub: "NIR · Red · Green", grad: "linear-gradient(to right, #ff2288, #44cc88)" },
                  { key: "ndvi", label: "NDVI", sub: "Escala de grises",   grad: "linear-gradient(to right, #000, #fff)" },
                ].map(({ key, label, sub, grad }) => (
                  <button key={key} onClick={() => switchView(key)}
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
                {stats && (
                  <button onClick={() => switchView("ndvi_masked")}
                    className={`flex items-center gap-2 px-2 py-1.5 border text-left transition-all
                      ${view === "ndvi_masked" ? "border-stone-300 bg-white/90" : "border-stone-100 bg-transparent opacity-50"}`}>
                    {/* Barra viridis real: morado→azul→verde→amarillo */}
                    <div className="w-3 h-10 rounded-sm flex-shrink-0" style={{
                      background: "linear-gradient(to bottom, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,97), rgb(253,231,36))"
                    }} />
                    <div>
                      <p className="font-sans font-bold text-xs text-stone-700">Masked</p>
                      <p className="font-sans text-[9px] text-stone-400 uppercase tracking-wider">Viridis</p>
                    </div>
                    {view === "ndvi_masked" && <span className="ml-auto text-green-700 text-xs">✓</span>}
                  </button>
                )}
              </div>
            </div>

            {selectedClusters.size > 0 && (
              <div className="bg-white/60 border border-stone-200 border-l-4 border-l-sky-400 p-3">
                <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-1">Selección</p>
                <p className="font-sans font-bold text-sm text-sky-700">{selectedClusters.size} cluster{selectedClusters.size > 1 ? "s" : ""}</p>
                <p className="font-sans text-[10px] text-stone-400 mt-0.5">
                  {Array.from(selectedClusters).map(c => `C${c + 1}`).join(" · ")}
                </p>
              </div>
            )}

            {stats && (
              <div className="bg-white/60 border border-stone-200 border-l-4 border-l-emerald-500 p-3">
                <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400 mb-2">Stats NDVI</p>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">Promedio</p>
                    <p className="font-sans font-bold text-sm text-emerald-700">{stats.average.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">Desv. Estándar</p>
                    <p className="font-sans font-bold text-sm text-emerald-700">{stats.std_dev.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">CV</p>
                    <p className="font-sans font-bold text-sm text-emerald-700">
                      {(stats.coefficient_of_variation * 100).toFixed(2)}%
                    </p>
                    <div className="mt-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (stats.coefficient_of_variation / 0.3) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="w-full bg-gradient-to-r from-stone-800 to-stone-900 border-t-2 border-yellow-600 px-6 py-1.5 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ready ? "bg-green-400" : loading ? "bg-yellow-400 animate-pulse" : "bg-stone-600"}`} />
        <span className="font-sans text-[11px] uppercase tracking-wider text-stone-400">{status}</span>
        {fileName && <span className="ml-auto font-sans text-[11px] text-stone-600">{fileName}</span>}
      </div>

      {/* ── Modal selección de TIFFs ── */}
      {tiffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
          onClick={() => setTiffModalOpen(false)}>
          <div className="flex flex-col gap-5 bg-stone-900 border-2 border-yellow-600 shadow-[8px_8px_0_#1a130a] p-5 w-[680px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-sans font-bold text-sm uppercase tracking-widest text-amber-200">Cargar Bandas PixelWrench2</p>
                <p className="font-sans text-[10px] text-stone-400 uppercase tracking-wider mt-1">Selecciona los 3 TIFFs exportados — cada uno con su banda individual</p>
              </div>
              <button onClick={() => setTiffModalOpen(false)}
                className="text-stone-500 hover:text-amber-200 transition-colors ml-4 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Band slots */}
            <div className="flex gap-3">
              {[
                { key: "nir",   label: "NIR",   ref: nirInputRef,   accent: "#e0457b", note: "Near Infrared" },
                { key: "red",   label: "Red",   ref: redInputRef,   accent: "#e07845", note: "Canal Rojo" },
                { key: "green", label: "Green", ref: greenInputRef, accent: "#45c07a", note: "Canal Verde" },
              ].map(({ key, label, ref, accent, note }) => (
                <div key={key}
                  className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed py-6 px-3 cursor-pointer transition-all"
                  style={{
                    borderColor: tiffFiles[key] ? accent : "#44403c",
                    background: tiffFiles[key] ? `${accent}12` : "transparent",
                  }}
                  onClick={() => ref.current?.click()}>
                  <input ref={ref} type="file" accept=".tif,.tiff" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) setTiffFiles(prev => ({ ...prev, [key]: f }));
                      e.target.value = "";
                    }} />

                  <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                    style={{ borderColor: accent, color: accent, background: tiffFiles[key] ? `${accent}22` : "transparent" }}>
                    {tiffFiles[key]
                      ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    }
                  </div>

                  <p className="font-sans font-bold text-sm uppercase tracking-widest" style={{ color: accent }}>{label}</p>
                  <p className="font-sans text-[9px] uppercase tracking-wider text-stone-500">{note}</p>
                  <p className="font-sans text-[10px] text-center leading-tight min-h-[2.5em] break-all"
                    style={{ color: tiffFiles[key] ? "#d6d3d1" : "#78716c" }}>
                    {tiffFiles[key] ? tiffFiles[key].name : "Click para seleccionar"}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-stone-700 pt-4">
              <button
                onClick={() => { setTiffModalOpen(false); setTiffFiles({ nir: null, red: null, green: null }); }}
                className="px-4 py-2 border border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-400 font-sans text-xs uppercase tracking-widest transition-all">
                Cancelar
              </button>
              <button
                disabled={!tiffFiles.nir || !tiffFiles.red || !tiffFiles.green}
                onClick={() => handleFiles(tiffFiles.nir, tiffFiles.red, tiffFiles.green)}
                className="flex items-center gap-2 px-5 py-2 border-2 font-sans font-semibold text-xs uppercase tracking-widest transition-all border-yellow-500/70 bg-yellow-600/30 hover:bg-yellow-500/45 text-yellow-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Procesar Bandas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}