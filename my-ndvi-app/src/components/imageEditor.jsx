import { useState, useRef, useCallback } from "react";
import { RAW_W, RAW_H, buildCIR, buildNDVI, renderToCanvas, displaySize } from "../hooks/useImageHelpers";
import useSubmitRaw from "../hooks/useSubmitRaw";
import useProcessClusters from "../hooks/useProcessClusters";

const NUM_CLUSTERS = 6;
const CLUSTER_COLOR = [135, 206, 235, 120];

/* ── Viridis exacto — generado con matplotlib.cm.get_cmap('viridis', 256) ── */
const VIRIDIS = [
  [68,1,84],[68,2,85],[68,3,87],[69,5,88],[69,6,90],[69,8,91],[70,9,92],[70,11,94],
  [70,12,95],[70,14,97],[71,15,98],[71,17,99],[71,18,101],[71,20,102],[71,21,103],[71,22,105],
  [71,24,106],[72,25,107],[72,26,108],[72,28,110],[72,29,111],[72,30,112],[72,32,113],[72,33,114],
  [72,34,115],[72,35,116],[71,37,117],[71,38,118],[71,39,119],[71,40,120],[71,42,121],[71,43,122],
  [71,44,123],[70,45,124],[70,47,124],[70,48,125],[70,49,126],[69,50,127],[69,52,127],[69,53,128],
  [69,54,129],[68,55,129],[68,57,130],[67,58,131],[67,59,131],[67,60,132],[66,61,132],[66,62,133],
  [66,64,133],[65,65,134],[65,66,134],[64,67,135],[64,68,135],[63,69,135],[63,71,136],[62,72,136],
  [62,73,137],[61,74,137],[61,75,137],[61,76,137],[60,77,138],[60,78,138],[59,80,138],[59,81,138],
  [58,82,139],[58,83,139],[57,84,139],[57,85,139],[56,86,139],[56,87,140],[55,88,140],[55,89,140],
  [54,90,140],[54,91,140],[53,92,140],[53,93,140],[52,94,141],[52,95,141],[51,96,141],[51,97,141],
  [50,98,141],[50,99,141],[49,100,141],[49,101,141],[49,102,141],[48,103,141],[48,104,141],[47,105,141],
  [47,106,141],[46,107,142],[46,108,142],[46,109,142],[45,110,142],[45,111,142],[44,112,142],[44,113,142],
  [44,114,142],[43,115,142],[43,116,142],[42,117,142],[42,118,142],[42,119,142],[41,120,142],[41,121,142],
  [40,122,142],[40,122,142],[40,123,142],[39,124,142],[39,125,142],[39,126,142],[38,127,142],[38,128,142],
  [38,129,142],[37,130,142],[37,131,141],[36,132,141],[36,133,141],[36,134,141],[35,135,141],[35,136,141],
  [35,137,141],[34,137,141],[34,138,141],[34,139,141],[33,140,141],[33,141,140],[33,142,140],[32,143,140],
  [32,144,140],[32,145,140],[31,146,140],[31,147,139],[31,148,139],[31,149,139],[31,150,139],[30,151,138],
  [30,152,138],[30,153,138],[30,153,138],[30,154,137],[30,155,137],[30,156,137],[30,157,136],[30,158,136],
  [30,159,136],[30,160,135],[31,161,135],[31,162,134],[31,163,134],[32,164,133],[32,165,133],[33,166,133],
  [33,167,132],[34,167,132],[35,168,131],[35,169,130],[36,170,130],[37,171,129],[38,172,129],[39,173,128],
  [40,174,127],[41,175,127],[42,176,126],[43,177,125],[44,177,125],[46,178,124],[47,179,123],[48,180,122],
  [50,181,122],[51,182,121],[53,183,120],[54,184,119],[56,185,118],[57,185,118],[59,186,117],[61,187,116],
  [62,188,115],[64,189,114],[66,190,113],[68,190,112],[69,191,111],[71,192,110],[73,193,109],[75,194,108],
  [77,194,107],[79,195,105],[81,196,104],[83,197,103],[85,198,102],[87,198,101],[89,199,100],[91,200,98],
  [94,201,97],[96,201,96],[98,202,95],[100,203,93],[103,204,92],[105,204,91],[107,205,89],[109,206,88],
  [112,206,86],[114,207,85],[116,208,84],[119,208,82],[121,209,81],[124,210,79],[126,210,78],[129,211,76],
  [131,211,75],[134,212,73],[136,213,71],[139,213,70],[141,214,68],[144,214,67],[146,215,65],[149,215,63],
  [151,216,62],[154,216,60],[157,217,58],[159,217,56],[162,218,55],[165,218,53],[167,219,51],[170,219,50],
  [173,220,48],[175,220,46],[178,221,44],[181,221,43],[183,221,41],[186,222,39],[189,222,38],[191,223,36],
  [194,223,34],[197,223,33],[199,224,31],[202,224,30],[205,224,29],[207,225,28],[210,225,27],[212,225,26],
  [215,226,25],[218,226,24],[220,226,24],[223,227,24],[225,227,24],[228,227,24],[231,228,25],[233,228,25],
  [236,228,26],[238,229,27],[241,229,28],[243,229,30],[246,230,31],[248,230,33],[250,230,34],[253,231,36],
];

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

  const dataRef       = useRef(null);
  const classifiedRef = useRef(null);
  const imgCanvasRef  = useRef(null);
  const maskCanvasRef = useRef(null);
  const fileInputRef  = useRef(null);

  const { submitRaw, loading }                   = useSubmitRaw();
  const { processClusters, loading: processing } = useProcessClusters();

  const saveMask = useCallback(() => {
    console.warn("saveMask: no implementado");
  }, []);

  /* ── Switch view ── */
  const switchView = useCallback((v) => {
    setView(v);
    const d = dataRef.current;
    if (!d) return;
    const { dw, dh } = displaySize();
    renderToCanvas(
      imgCanvasRef.current,
      v === "cir" ? buildCIR(d.nir, d.red, d.green) : buildNDVI(d.ndvi),
      dw, dh
    );
    setStats(null);
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
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setReady(false); setStatus(`Enviando ${file.name}…`);
    setFileName(file.name); setSelectedClusters(new Set()); setStats(null);
    const data = await submitRaw(file);
    if (!data) { setStatus("⚠ Error al enviar archivo"); return; }
    const { ndvi, classified, nir, red, green } = data;
    if (!nir || !red || !green) { setStatus("⚠ El backend no retorna nir/red/green"); return; }
    dataRef.current       = { ndvi, nir, red, green };
    classifiedRef.current = classified;
    const { dw, dh } = displaySize();
    renderToCanvas(imgCanvasRef.current, buildCIR(nir, red, green), dw, dh);
    const maskC = maskCanvasRef.current;
    maskC.width = dw; maskC.height = dh;
    maskC.getContext("2d").clearRect(0, 0, dw, dh);
    setView("cir"); setDims({ dw, dh }); setReady(true);
    setStatus("✓ Imagen cargada — selecciona clusters y presiona Procesar");
  }, [submitRaw]);

  /* ── Renderizar ndvi_masked con viridis exacto de matplotlib ── */
  const renderNdviMasked = useCallback((ndviMasked, dw, dh) => {
    const canvas = imgCanvasRef.current;
    if (!canvas) return;

    // 1. min/max ignorando sentinels (-9999, 9999, null, NaN)
    let min = Infinity, max = -Infinity;
    for (const row of ndviMasked)
      for (const v of row)
        if (!isSentinel(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
    const range = max - min || 1;
    console.log("[ndvi_masked] min:", min, "max:", max, "range:", range);

    // 2. Pintar con viridis
    const ctx    = canvas.getContext("2d");
    const id     = ctx.createImageData(dw, dh);
    const scaleX = RAW_W / dw;
    const scaleY = RAW_H / dh;

    for (let dy = 0; dy < dh; dy++) {
      const srcRow = ndviMasked[Math.floor(dy * scaleY)];
      for (let dx = 0; dx < dw; dx++) {
        const val = srcRow?.[Math.floor(dx * scaleX)];
        const i   = (dy * dw + dx) * 4;
        if (isSentinel(val)) {
          // fondo: casi negro
          id.data[i]=8; id.data[i+1]=8; id.data[i+2]=12; id.data[i+3]=220;
        } else {
          const t         = Math.max(0, Math.min(1, (val - min) / range));
          const [r, g, b] = VIRIDIS[Math.min(255, Math.floor(t * 255))];
          id.data[i]=r; id.data[i+1]=g; id.data[i+2]=b; id.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(id, 0, 0);

    // 3. Limpiar capa de clusters
    const maskC = maskCanvasRef.current;
    if (maskC) maskC.getContext("2d").clearRect(0, 0, dw, dh);
  }, []);

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
      const { dw, dh } = dims;
      renderNdviMasked(ndvi_masked, dw, dh);
      setView("ndvi_masked");
      setStats(stats_ndvi);
      setStatus(`✓ Procesado — clusters: ${selectedList.map(c => c + 1).join(", ")}`);
    } else {
      setStatus("⚠ Error al procesar clusters");
    }
  }, [processClusters, selectedClusters, dims, renderNdviMasked]);

  /* ── Botón principal ── */
  const mainBtn = !ready
    ? {
        label: "Cargar RAW", onClick: () => fileInputRef.current.click(),
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
        <input ref={fileInputRef} type="file" accept=".raw" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />

        <Btn onClick={mainBtn.onClick} disabled={mainBtn.disabled} variant={mainBtn.variant}>
          {mainBtn.icon}{mainBtn.label}
        </Btn>

        <div className="w-px h-7 bg-white/20" />

        <Btn onClick={saveMask} disabled={selectedClusters.size === 0} variant="green">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Guardar Máscara
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
              onClick={() => fileInputRef.current.click()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
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
              <p className="font-sans font-bold text-sm uppercase tracking-widest text-stone-500 mb-1">Arrastra el archivo .RAW</p>
              <p className="font-sans text-xs text-stone-400">Tetracam · 2048×1536px</p>
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
              onClick={handleClick}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}>
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
                  <div className={`flex items-center gap-2 px-2 py-1.5 border
                    ${view === "ndvi_masked" ? "border-stone-300 bg-white/90" : "border-stone-100 bg-transparent opacity-60"}`}>
                    {/* Barra viridis real: morado→azul→verde→amarillo */}
                    <div className="w-3 h-10 rounded-sm flex-shrink-0" style={{
                      background: "linear-gradient(to bottom, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,97), rgb(253,231,36))"
                    }} />
                    <div>
                      <p className="font-sans font-bold text-xs text-stone-700">Masked</p>
                      <p className="font-sans text-[9px] text-stone-400 uppercase tracking-wider">Viridis</p>
                    </div>
                    {view === "ndvi_masked" && <span className="ml-auto text-green-700 text-xs">✓</span>}
                  </div>
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
    </div>
  );
}