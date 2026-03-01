export default function StatusBar({ status, ready, loading, fileName }) {
  const isError = status.startsWith("⚠");
  return (
    <div className="w-full bg-stone-900 border-t border-stone-700/80 px-6 py-1.5 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isError  ? "bg-red-400 animate-pulse" :
        ready    ? "bg-green-400" :
        loading  ? "bg-yellow-400 animate-pulse" :
                   "bg-stone-600"}`}
      />
      <span className={`font-sans text-[11px] uppercase tracking-wider ${isError ? "text-red-400" : "text-stone-400"}`}>
        {status}
      </span>
      {fileName && (
        <span className="ml-auto font-sans text-[11px] text-stone-600">{fileName}</span>
      )}
    </div>
  );
}
