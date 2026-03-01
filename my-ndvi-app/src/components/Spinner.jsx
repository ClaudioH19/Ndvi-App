/**
 * Spinner — componente de carga reutilizable.
 *
 * Props:
 *   size  "sm" | "md" | "lg"   — tamaño del contenedor (default "md")
 *   color string                — clase de color Tailwind para el ícono (default "text-green-400")
 *
 * Para cambiar el ícono de carga en el futuro, edita únicamente SpinnerIcon.
 * El resto del componente (tamaños, animación, color) se mantiene igual.
 */

/* ── Ícono intercambiable ──────────────────────────────────────────────── */
function SpinnerIcon({ className }) {
  // Cámara gris con lente negro, y luces verde y roja arriba a la derecha.
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cuerpo de la cámara (rectángulo gris) */}
      <rect x="15" y="30" width="70" height="45" rx="6" fill="#9ca3af" />
      {/* Botón superior / visor */}
      <rect x="25" y="22" width="20" height="8" rx="2" fill="#6b7280" />
      
      {/* Lente principal (círculo negro) */}
      <circle cx="50" cy="52" r="14" fill="#1f2937" />
      {/* Reflejo en el lente */}
      <circle cx="45" cy="47" r="4" fill="#4b5563" />
      
      {/* Luz roja y verde arriba a la derecha */}
      <circle cx="75" cy="38" r="3" fill="#ef4444" />
      <circle cx="68" cy="38" r="3" fill="#22c55e" />
    </svg>
  );
}

/* ── Tamaños predefinidos ─────────────────────────────────────────────── */
const SIZE = {
  sm: "w-5 h-5",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

/* ── Componente principal ─────────────────────────────────────────────── */
export default function Spinner({ size = "md" }) {
  // La clase .animate-camera está definida en style.css con @keyframes cameraOrbit
  return (
    <SpinnerIcon className={`${SIZE[size] ?? SIZE.md} animate-camera`} />
  );
}
