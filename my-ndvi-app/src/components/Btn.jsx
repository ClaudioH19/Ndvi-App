export default function Btn({ onClick, disabled, variant = "white", children }) {
  const v = {
    white:  "border-white/25 bg-white/10 hover:bg-white/20 hover:border-yellow-300 text-amber-100",
    green:  "border-green-400/50 bg-green-700/25 hover:bg-green-600/40 text-green-200",
    yellow: "border-yellow-500/70 bg-yellow-600/30 hover:bg-yellow-500/45 text-yellow-200",
    ghost:  "border-white/10 bg-transparent hover:bg-white/10 text-amber-200/50 hover:text-amber-100",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 border-2 font-sans font-semibold text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${v}`}>
      {children}
    </button>
  );
}
