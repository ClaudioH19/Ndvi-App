import { useState, useRef, useCallback } from "react";

/* ── Constants ─────────────────────────────────────────── */
const RAW_W = 2048, RAW_H = 1536, NUM_CLUSTERS = 6;

// Celeste semitransparente para todos los clusters
const CLUSTER_COLOR = [135, 206, 235, 120]; // sky blue, alpha ~47%

/* ── Image helpers ─────────────────────────────────────── */
// Normaliza al rango real de 0-255, con opción de ajustar brillo (para CIR)
function norm(v, brightness = 1) {
  return Math.min(255, Math.max(0, Math.round((v ?? 0) / 255 * brightness)));
}

function buildCIR(nir, red, green) {
  let nirMn = Infinity, nirMx = -Infinity;
  let redMn = Infinity, redMx = -Infinity;
  let grnMn = Infinity, grnMx = -Infinity;
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const n = nir[y]?.[x], r = red[y]?.[x], g = green[y]?.[x];
      if (n != null && isFinite(n)) { if (n < nirMn) nirMn = n; if (n > nirMx) nirMx = n; }
      if (r != null && isFinite(r)) { if (r < redMn) redMn = r; if (r > redMx) redMx = r; }
      if (g != null && isFinite(g)) { if (g < grnMn) grnMn = g; if (g > grnMx) grnMx = g; }
    }
  const id = new Uint8ClampedArray(RAW_W * RAW_H * 4);
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const i = (y * RAW_W + x) * 4;
      id[i]   = norm(nir[y]?.[x]   ?? nirMn, nirMn, nirMx);
      id[i+1] = norm(red[y]?.[x]   ?? redMn, redMn, redMx);
      id[i+2] = norm(green[y]?.[x] ?? grnMn, grnMn, grnMx);
      id[i+3] = 255;
    }
  return id;
}

function buildNDVI(ndvi) {
  const id = new Uint8ClampedArray(RAW_W * RAW_H * 4);
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const i = (y * RAW_W + x) * 4;
      const v = Math.min(255, Math.max(0, Math.round((((ndvi[y]?.[x] ?? -1) + 1) / 2) * 255)));
      id[i]=v; id[i+1]=v; id[i+2]=v; id[i+3]=255;
    }
  return id;
}

function renderToCanvas(canvas, pixelData, dw, dh) {
  canvas.width = dw; canvas.height = dh;
  const tmp = document.createElement("canvas");
  tmp.width = RAW_W; tmp.height = RAW_H;
  tmp.getContext("2d").putImageData(new ImageData(pixelData, RAW_W, RAW_H), 0, 0);
  canvas.getContext("2d").drawImage(tmp, 0, 0, dw, dh);
}

function displaySize() {
  const availW = Math.min(window.innerWidth - 220, 1400);
  const availH = window.innerHeight - 120;
  let dw = RAW_W, dh = RAW_H;
  if (dw > availW) { dh = Math.round(dh * availW / dw); dw = availW; }
  if (dh > availH) { dw = Math.round(dw * availH / dh); dh = availH; }
  return { dw, dh };
}

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
  const [loading, setLoading]                   = useState(false);
  const [processing, setProcessing]             = useState(false);
  const [status, setStatus]                     = useState("Sin archivo cargado");
  const [fileName, setFileName]                 = useState("");
  const [selectedClusters, setSelectedClusters] = useState(new Set());
  const [dims, setDims]                         = useState({ dw: 0, dh: 0 });
  const [view, setView]                         = useState("cir");

  const dataRef       = useRef(null);
  const classifiedRef = useRef(null);
  const imgCanvasRef  = useRef(null);
  const maskCanvasRef = useRef(null);
  const fileInputRef  = useRef(null);

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
  }, []);

  /* ── Redraw cluster mask (celeste uniforme) ── */
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

  /* ── Canvas click → cluster ── */
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

  /* ── Deshacer: quita el último cluster añadido ── */
  const handleUndo = useCallback(() => {
    setSelectedClusters((prev) => {
      if (prev.size === 0) return prev;
      const arr  = Array.from(prev);
      const next = new Set(arr.slice(0, -1));
      const { dw, dh } = displaySize();
      redrawMask(next, dw, dh);
      return next;
    });
  }, [redrawMask]);

  /* ── Upload → backend ── */
  const handleFile = useCallback((file) => {
    if (!file) return;
    setLoading(true); setReady(false); setStatus(`Enviando ${file.name}…`);
    setFileName(file.name); setSelectedClusters(new Set());

    const fd = new FormData();
    fd.append("file", file);

    fetch("/api/v1/ndvi/submit-raw", { method: "POST", body: fd })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ ndvi, classified, nir, red, green }) => {
        if (!nir || !red || !green)
          throw new Error("El backend no retorna nir/red/green");

        dataRef.current       = { ndvi, nir, red, green };
        classifiedRef.current = classified;

        const { dw, dh } = displaySize();
        renderToCanvas(imgCanvasRef.current, buildCIR(nir, red, green), dw, dh);

        const maskC = maskCanvasRef.current;
        maskC.width = dw; maskC.height = dh;
        maskC.getContext("2d").clearRect(0, 0, dw, dh);

        setView("cir");
        setDims({ dw, dh });
        setReady(true);
        setLoading(false);
        setStatus("✓ Imagen cargada — selecciona clusters y presiona Procesar");
      })
      .catch((err) => { setLoading(false); setStatus(`⚠ ${err.message}`); });
  }, []);

  /* ── Procesar → /process ── */
  const handleProcess = useCallback(() => {
    const d   = dataRef.current;
    const cls = classifiedRef.current;
    if (!d || !cls || selectedClusters.size === 0) return;

    setProcessing(true);
    setStatus("Procesando clusters seleccionados…");

    const selectedList       = Array.from(selectedClusters);
    const classifiedFiltered = cls.map(row =>
      row.map(v => (v != null && !isNaN(v) && selectedClusters.has(v) ? v : null))
    );

    fetch("/api/v1/ndvi/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ndvi:                d.ndvi,
        classified_filtered: classifiedFiltered,
        selected_clusters:   selectedList,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((result) => {
        setProcessing(false);
        setStatus(`✓ Procesado — clusters: ${selectedList.map(c => c + 1).join(", ")}`);
        console.log("[/process] result:", result);
      })
      .catch((err) => { setProcessing(false); setStatus(`⚠ ${err.message}`); });
  }, [selectedClusters]);

  /* ── Save mask ── */
  const saveMask = () => {
    const cls = classifiedRef.current;
    if (!cls || selectedClusters.size === 0) return;
    const c = document.createElement("canvas");
    c.width = RAW_W; c.height = RAW_H;
    const ctx = c.getContext("2d");
    const id  = ctx.createImageData(RAW_W, RAW_H);
    for (let y = 0; y < RAW_H; y++)
      for (let x = 0; x < RAW_W; x++) {
        const cl = cls[y]?.[x], i = (y * RAW_W + x) * 4;
        const v  = (cl != null && !isNaN(cl) && selectedClusters.has(cl)) ? 255 : 0;
        id.data[i]=v; id.data[i+1]=v; id.data[i+2]=v; id.data[i+3]=255;
      }
    ctx.putImageData(id, 0, 0);
    const a = document.createElement("a");
    a.download = `mascara_${Date.now()}.png`; a.href = c.toDataURL(); a.click();
    setStatus("✓ Máscara exportada");
  };

  /* ── Botón principal mutante ── */
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

        {/* Deshacer — al extremo derecho */}
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

          {/* Canvas — siempre en DOM */}
          <div style={{ display: ready && !loading ? "block" : "none" }}>
            <p className="font-sans text-[11px] uppercase tracking-widest text-stone-400 mb-2">
              {view === "cir" ? "CIR — NIR→R · Red→G · Green→B" : "NDVI — escala de grises"} · click para activar cluster
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