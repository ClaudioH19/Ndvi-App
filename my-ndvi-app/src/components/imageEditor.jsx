import { useState, useRef, useCallback, useEffect } from "react";
import { RAW_W, RAW_H, buildCIR, buildNDVI, buildCIRMasked, buildNDVIMasked, renderToCanvas, displaySize, VIRIDIS } from "../hooks/useImageHelpers";
import useSubmitTiffs from "../hooks/useSubmitTiffs";
import useProcessClusters from "../hooks/useProcessClusters";
import useSaveMask from "../hooks/useSaveMask";
import useDownloadSession from "../hooks/useDownloadSession";
import Btn from "./Btn";
import Spinner from "./Spinner";
import DropZone from "./DropZone";
import TiffModal from "./TiffModal";
import SidePanel from "./SidePanel";
import StatusBar from "./StatusBar";
import StatsCard from "./StatsCard";

const CLUSTER_COLOR = [135, 206, 235, 120];
const isSentinel    = (v) => v == null || isNaN(v) || v >= 9000 || v <= -9000;
const BAND_KEYWORD  = { nir: /nir/i, red: /red/i, green: /green/i };

export default function RawMaskEditor() {
  const [ready, setReady]                       = useState(false);
  const [status, setStatus]                     = useState("Sin archivo cargado");
  const [fileName, setFileName]                 = useState("");
  const [fileNames, setFileNames]               = useState(null);
  const [selectedClusters, setSelectedClusters] = useState(new Set());
  const [dims, setDims]                         = useState({ dw: 0, dh: 0 });
  const [view, setView]                         = useState("cir");
  const [stats, setStats]                       = useState(null);
  const [tiffModalOpen, setTiffModalOpen]       = useState(false);
  const [tiffFiles, setTiffFiles]               = useState({ nir: null, red: null, green: null });
  const [tiffWarnings, setTiffWarnings]         = useState({ nir: false, red: false, green: false });
  const [modalDragOver, setModalDragOver]       = useState(false);
  const [mainDragOver, setMainDragOver]         = useState(false);
  const [hoverInfo, setHoverInfo]               = useState(null);
  // Contador de resultados guardados en Redis en esta sesión
  const [sessionSavedCount, setSessionSavedCount] = useState(0);

  const dataRef       = useRef(null);
  const classifiedRef = useRef(null);
  const imgCanvasRef  = useRef(null);
  const maskCanvasRef = useRef(null);

  // Identificador de sesión único generado una sola vez por pestaña/carga de página
  const [sessionId] = useState(() => crypto.randomUUID());

  const { submitTiffs,     loading,              error: tiffError    } = useSubmitTiffs();
  const { processClusters, loading: processing,  error: processError } = useProcessClusters();
  const { saveMask: saveMaskApi, loading: saving, error: saveError   } = useSaveMask();
  const { downloadSession, downloading, error: downloadError }         = useDownloadSession();

  /* ── Hover NDVI sobre el canvas ── */
  const handleCanvasHover = useCallback((e) => {
    const d = dataRef.current;
    if (!d?.ndvi || !dims.dw || !dims.dh) return;
    const rect = imgCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = Math.floor(x * RAW_W / dims.dw);
    const ry = Math.floor(y * RAW_H / dims.dh);
    if (rx < 0 || ry < 0 || rx >= RAW_W || ry >= RAW_H) { setHoverInfo(null); return; }
    // Si hay máscara aplicada y estamos en vista masked, usar ndvi_masked
    const useMasked = view === "ndvi_masked" && d.ndvi_masked;
    const ndviVal = useMasked ? d.ndvi_masked?.[ry]?.[rx] : d.ndvi?.[ry]?.[rx];
    setHoverInfo({ x, y, rx, ry, ndvi: isSentinel(ndviVal) ? 'NA' : ndviVal.toFixed(3) });
  }, [dims, view]);

  /* ── Propagar errores de los hooks al status bar ── */
  useEffect(() => { if (tiffError)     setStatus(`⚠ Error al enviar bandas: ${tiffError}`);         }, [tiffError]);
  useEffect(() => { if (processError)  setStatus(`⚠ Error al procesar: ${processError}`);            }, [processError]);
  useEffect(() => { if (saveError)     setStatus(`⚠ Error al guardar máscara: ${saveError}`);        }, [saveError]);
  useEffect(() => { if (downloadError) setStatus(`⚠ Error al descargar sesión: ${downloadError}`);   }, [downloadError]);

  /* ── Validate file band keyword ── */
  const validateFile = useCallback((key, file) => {
    if (!file) return;
    setTiffWarnings(prev => ({ ...prev, [key]: !BAND_KEYWORD[key].test(file.name) }));
  }, []);

  /* ── Extrae el nombre base: todo lo que va antes del primer "_" ── */
  const extractBase = useCallback((file) => {
    if (!file) return null;
    const name = file.name.replace(/\.(tif|tiff)$/i, "");
    const idx = name.indexOf("_");
    return idx !== -1 ? name.slice(0, idx) : name;
  }, []);

  /* ── Auto-asignar archivos arrastrados al modal por palabra clave ── */
  const autoAssignDrop = useCallback((files) => {
    const tiffs = Array.from(files).filter(f => /\.(tif|tiff)$/i.test(f.name));
    if (!tiffs.length) return;
    const assigned = { nir: null, red: null, green: null };
    for (const f of tiffs) {
      if (/nir/i.test(f.name))        assigned.nir   = f;
      else if (/red/i.test(f.name))   assigned.red   = f;
      else if (/green/i.test(f.name)) assigned.green = f;
    }
    setTiffFiles(prev => ({
      nir:   assigned.nir   ?? prev.nir,
      red:   assigned.red   ?? prev.red,
      green: assigned.green ?? prev.green,
    }));
    setTiffWarnings({
      nir:   assigned.nir   ? false : false,
      red:   assigned.red   ? false : false,
      green: assigned.green ? false : false,
    });
  }, []);

  const saveMask = useCallback(async () => {
    const d = dataRef.current;
    if (!d?.ndvi_masked) return;
    // Use only the base name (before first '_') of the NIR file
    let name = fileNames?.nir || fileName;
    name = name.replace(/\.(tif|tiff)$/i, "");
    const idx = name.indexOf("_");
    name = idx !== -1 ? name.slice(0, idx) : name;
    const result = await saveMaskApi(d.ndvi_masked, name);
    if (result) setStatus(`✓ Máscara guardada: ${result.filename}`);
    else        setStatus("⚠ Error al guardar máscara");
  }, [fileName, saveMaskApi]);

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

  /* ── Switch view ── */
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

  const handleReset = useCallback(() => {
    dataRef.current       = null;
    classifiedRef.current = null;
    setReady(false);
    setStatus("Sin archivo cargado");
    setFileName("");
    setFileNames(null);
    setSelectedClusters(new Set());
    setStats(null);
    setView("cir");
    setDims({ dw: 0, dh: 0 });
    setHoverInfo(null);
    const img  = imgCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (img)  img.getContext("2d").clearRect(0, 0, img.width,  img.height);
    if (mask) mask.getContext("2d").clearRect(0, 0, mask.width, mask.height);
  }, []);

  /* ── Upload ── */
  const handleFiles = useCallback(async (nirFile, redFile, greenFile) => {
    if (!nirFile || !redFile || !greenFile) return;
    setTiffModalOpen(false);
    setReady(false); setStatus("Enviando bandas TIFF…");
    setFileName(`NIR: ${nirFile.name}`);
    setFileNames({ nir: nirFile.name, red: redFile.name, green: greenFile.name });
      setSelectedClusters(new Set()); setStats(null);
    const data = await submitTiffs(nirFile, redFile, greenFile);
    if (!data) { setStatus("⚠ Error al enviar archivos"); return; }
    const { ndvi, classified, nir, red, green, cluster_labels } = data;
    if (!nir || !red || !green) { setStatus("⚠ El backend no retorna nir/red/green"); return; }
    dataRef.current       = { ndvi, nir, red, green, cluster_labels };  // ndvi_masked se limpia al cargar nueva imagen
    classifiedRef.current = classified;
    const { dw, dh } = displaySize();
    renderToCanvas(imgCanvasRef.current, buildCIR(nir, red, green), dw, dh);
    const maskC = maskCanvasRef.current;
    maskC.width = dw; maskC.height = dh;
    maskC.getContext("2d").clearRect(0, 0, dw, dh);
    setView("cir"); setDims({ dw, dh }); setReady(true);
    setStatus("✓ Imagen cargada — selecciona clusters y presiona Procesar");
    setTiffFiles({ nir: null, red: null, green: null });
    setTiffWarnings({ nir: false, red: false, green: false });
      // Auto-select clusters labeled 'Planta'
      if (Array.isArray(cluster_labels)) {
        const plantaSet = new Set();
        cluster_labels.forEach((label, idx) => {
          if (label === "Planta") plantaSet.add(idx);
        });
        setSelectedClusters(plantaSet);
        redrawMask(plantaSet, dw, dh);
      }
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

    // Nombre base del archivo NIR (antes del primer '_') para Redis
    const imgName = (() => {
      const raw = fileNames?.nir || fileName;
      const n   = raw.replace(/\.(tif|tiff)$/i, "");
      const i   = n.indexOf("_");
      return i !== -1 ? n.slice(0, i) : n;
    })();

    const result = await processClusters(ndviClasificado, selectedList, d.ndvi, sessionId, imgName);
    if (result) {
      const { ndvi_masked, stats_ndvi } = result;
      dataRef.current = { ...dataRef.current, ndvi_masked };
      switchView("ndvi_masked");
      setStats(stats_ndvi);
      setSessionSavedCount(c => c + 1);
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
        disabled: selectedClusters.size === 0 || processing || stats !== null,
        variant: "yellow",
        icon: processing
          ? <Spinner size="sm" color="text-yellow-300" />
          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>,
      };

  const viewLabel = {
    cir:         "CIR — NIR→R · Red→G · Green→B",
    ndvi:        "NDVI — escala de grises",
    ndvi_masked: "NDVI Masked — viridis · resultado del proceso",
  }[view] ?? view;

  /* ── Render ── */
  return (
    <div id="tool" className="flex flex-col w-full min-h-screen bg-amber-50">

      {/* Toolbar */}
      <div className="w-full bg-gradient-to-r from-green-950 to-stone-900 border-b border-stone-700 px-6 py-3 flex items-center gap-3">
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
        <Btn onClick={() => downloadSession(sessionId)} disabled={downloading || sessionSavedCount === 0} variant="blue">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {downloading ? "Descargando…" : "Descargar Sesión"}
        </Btn>
        <div className="ml-auto">
          <Btn onClick={handleReset} disabled={!ready && !fileName} variant="ghost">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reiniciar
          </Btn>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 w-full overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col p-5 overflow-auto">

          {!ready && !loading && (
            <DropZone
              mainDragOver={mainDragOver}
              setMainDragOver={setMainDragOver}
              autoAssignDrop={autoAssignDrop}
              onOpen={() => setTiffModalOpen(true)}
            />
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-96">
              <Spinner size="md" />
              <p className="animate-text-pulse font-sans text-xs uppercase tracking-widest text-stone-500">{status}</p>
            </div>
          )}

          <div style={{ display: ready && !loading ? "block" : "none" }}>
            <p className="font-sans text-[11px] uppercase tracking-widest text-stone-400 mb-2">
              {viewLabel} · click para activar cluster
            </p>
            <div
              className="relative inline-block border border-stone-600/60 shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden cursor-crosshair"
              style={{ width: dims.dw, height: dims.dh, maxWidth: "100%" }}
              onClick={handleClick}
              onMouseMove={handleCanvasHover}
              onMouseLeave={() => setHoverInfo(null)}>
              
              {/* Overlay de procesamiento sobre el canvas */}
              {processing && (
                <div className="absolute inset-0 z-40 bg-stone-950/40 backdrop-blur-[3px] flex flex-col items-center justify-center gap-4">
                  <Spinner size="md" />
                  <span className="animate-text-pulse font-mono text-xs uppercase tracking-widest text-stone-200">Calculando NDVI...</span>
                </div>
              )}

              <span className="absolute top-1.5 left-2 z-10 font-sans text-[9px] tracking-[.2em] uppercase text-yellow-300/60 pointer-events-none select-none">
                {RAW_W}×{RAW_H}
              </span>
              <canvas ref={imgCanvasRef}  className="absolute inset-0 z-0" />
              <canvas ref={maskCanvasRef} className="absolute inset-0 z-10" />
              <canvas width={dims.dw || 1} height={dims.dh || 1} className="relative z-20 opacity-0 block" />
              {hoverInfo && (
                <div style={{
                  position: "absolute",
                  left: Math.max(0, Math.min(dims.dw - 80, hoverInfo.x + 12)),
                  top:  Math.max(0, Math.min(dims.dh - 40, hoverInfo.y + 12)),
                  zIndex: 30, pointerEvents: "none",
                  background: hoverInfo.ndvi === 'NA' ? "rgba(40,40,40,0.92)" : "rgba(255,255,255,0.97)",
                  border: hoverInfo.ndvi === 'NA' ? "1.5px solid #57534e" : "1.5px solid #eab308",
                  borderRadius: 6,
                  padding: "4px 10px", fontFamily: "monospace",
                  fontSize: 13, color: hoverInfo.ndvi === 'NA' ? "#a8a29e" : "#78350f",
                  boxShadow: "2px 2px 8px #0002",
                }}>
                  <div>NDVI: <b>{hoverInfo.ndvi}</b></div>
                  <div className="text-stone-400 text-xs">({hoverInfo.rx}, {hoverInfo.ry})</div>
                </div>
              )}
            </div>

            {/* Banner informativo cuando se muestra la vista masked */}
            {view === "ndvi_masked" && stats && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-stone-100 border border-stone-300 rounded text-stone-600 text-xs leading-relaxed max-w-xl">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>
                  <b className="text-stone-700">Las áreas oscuras no se consideran en el cálculo.</b>{" "}
                  Solo los clusters seleccionados con NDVI ≥ {0.55} participan en las estadísticas.
                </span>
              </div>
            )}
          </div>
        </div>

        <StatsCard stats={stats} />

        {ready && !loading && (
          <SidePanel
            fileNames={fileNames}
            view={view}
            switchView={switchView}
            hasMasked={!!stats}
            selectedClusters={selectedClusters}
            clusterLabels={dataRef.current?.cluster_labels}
          />
        )}
      </div>

      <StatusBar status={status} ready={ready} loading={loading} fileName={fileName} />

      {tiffModalOpen && (
        <TiffModal
          tiffFiles={tiffFiles}           setTiffFiles={setTiffFiles}
          tiffWarnings={tiffWarnings}     setTiffWarnings={setTiffWarnings}
          modalDragOver={modalDragOver}   setModalDragOver={setModalDragOver}
          extractBase={extractBase}
          validateFile={validateFile}
          autoAssignDrop={autoAssignDrop}
          onClose={() => setTiffModalOpen(false)}
          onSubmit={handleFiles}
        />
      )}
    </div>
  );
}









