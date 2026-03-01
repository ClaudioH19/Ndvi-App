import { useEffect, useState } from "react";
import { Upload, SlidersHorizontal, BarChart2, ChevronDown } from "lucide-react";
import heroBg from "../images/vides_loop.mp4";


/**
 * HeroBanner
 *
 * Imagen de fondo:
 *   Cambia HERO_BG por la ruta de tu imagen, p.ej. "/images/campo.jpg"
 *   Sin imagen se muestra un degradado oscuro.
 *
 * Subtítulos rotativos:
 *   Edita el array ROTATING_LINES para cambiar las frases que se alternan.
 *   Cada una hace fade-out → fade-in cada INTERVAL ms.
 */

/* ── Config ───────────────────────────────────────────────────────────── */
const INTERVAL = 2800;   // ms entre cambios de subtítulo

const ROTATING_LINES = [
  "Análisis NDVI para imágenes Tetracam.",
  "Carga NIR · Red · Green y selecciona clusters.",
  "Exporta máscaras y resultados en un clic.",
  "Es necesario obtener las bandas desde PixelWrench2.",
];

/* ── Componente ───────────────────────────────────────────────────────── */
export default function HeroBanner() {
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);  // controla el fade

  useEffect(() => {
    const cycle = setInterval(() => {
      // 1. fade-out
      setVisible(false);
      // 2. cambia texto + fade-in después de 400 ms (duración del fade-out)
      setTimeout(() => {
        setIndex(i => (i + 1) % ROTATING_LINES.length);
        setVisible(true);
      }, 400);
    }, INTERVAL);
    return () => clearInterval(cycle);
  }, []);

  return (
    <>
      <header className="relative w-full overflow-hidden">
        {/* Video de fondo NDVI */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          src={heroBg}
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Overlay semitransparente para legibilidad del texto */}
        <div
          className="absolute inset-0 bg-black/55"
          style={{ zIndex: 1 }}
          aria-hidden
        />

        {/* Borde inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-yellow-600/0 via-yellow-500 to-yellow-600/0" />

        {/* Botón scroll-down */}
        <button
          onClick={() => document.getElementById("tool")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-6 right-8 z-10 flex flex-col items-center gap-1 text-yellow-400/70 hover:text-yellow-300 transition-colors group"
          aria-label="Ir a la herramienta"
        >
          <span className="font-mono text-[9px] uppercase tracking-[.2em]">Ir a la herramienta</span>
          <ChevronDown size={22} className="animate-bounce" />
        </button>

        {/* Contenido — alineado a la izquierda */}
        <div className="relative z-10 flex flex-col justify-center px-10 md:px-16 py-12 md:py-16 max-w-3xl gap-4">
          {/* Etiqueta pequeña */}
          <span className="font-mono text-[10px] uppercase tracking-[.25em] text-yellow-500/80">
            Remote Sensing · NDVI
          </span>
          {/* Título fijo */}
          <h1 className="font-black text-3xl md:text-5xl tracking-tight text-white leading-tight">
            Análisis NDVI
          </h1>
          {/* Línea decorativa */}
          <div className="w-10 h-[3px] bg-yellow-500 rounded-full" />
          {/* Subtítulo rotativo */}
          <p
            className="font-sans text-sm md:text-base text-stone-300 leading-relaxed transition-opacity duration-400 ease-in-out"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {ROTATING_LINES[index]}
          </p>
        </div>
      </header>

      {/* Franja explicativa */}
      <section className="w-full bg-stone-900 py-10 flex flex-col items-center">

        {/* Tarjetas */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-5 px-6 md:px-4">

          {/* Tarjeta 1 */}
          <div className="relative bg-stone-800 rounded-2xl overflow-hidden flex flex-col items-center text-center p-7 gap-4 border border-stone-700 hover:border-amber-600/50 hover:-translate-y-1 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="w-14 h-14 rounded-2xl bg-amber-900/40 flex items-center justify-center">
              <Upload size={28} className="text-amber-400" />
            </div>
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-900/60 flex items-center justify-center">
              <span className="font-black text-[11px] text-amber-400">1</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100 mb-2">Obtén las bandas desde PixelWrench2</h3>
              <p className="text-stone-400 text-xs leading-relaxed">Exporta las bandas <span className="font-semibold text-stone-300">NIR, Red y Green</span> desde tu imagen Tetracam usando PixelWrench2 en formato TIFF.</p>
            </div>
          </div>

          {/* Tarjeta 2 */}
          <div className="relative bg-stone-800 rounded-2xl overflow-hidden flex flex-col items-center text-center p-7 gap-4 border border-stone-700 hover:border-yellow-600/50 hover:-translate-y-1 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-yellow-500 to-amber-400" />
            <div className="w-14 h-14 rounded-2xl bg-yellow-900/40 flex items-center justify-center">
              <SlidersHorizontal size={28} className="text-yellow-400" />
            </div>
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-yellow-900/60 flex items-center justify-center">
              <span className="font-black text-[11px] text-yellow-400">2</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100 mb-2">Procesamiento y clusterización</h3>
              <p className="text-stone-400 text-xs leading-relaxed">El sistema agrupa los píxeles en clusters y tú seleccionas visualmente las <span className="font-semibold text-stone-300">zonas de interés</span> para el análisis.</p>
            </div>
          </div>

          {/* Tarjeta 3 */}
          <div className="relative bg-stone-800 rounded-2xl overflow-hidden flex flex-col items-center text-center p-7 gap-4 border border-stone-700 hover:border-green-600/50 hover:-translate-y-1 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-600 to-emerald-500" />
            <div className="w-14 h-14 rounded-2xl bg-green-900/40 flex items-center justify-center">
              <BarChart2 size={28} className="text-green-400" />
            </div>
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-green-900/60 flex items-center justify-center">
              <span className="font-black text-[11px] text-green-400">3</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100 mb-2">NDVI + máscara TIFF exportable</h3>
              <p className="text-stone-400 text-xs leading-relaxed">Se calcula el <span className="font-semibold text-stone-300">índice NDVI</span> y se genera una máscara TIFF georreferenciada para replicar el análisis en tu SIG.</p>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

