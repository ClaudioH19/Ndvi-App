export default function DropZone({ mainDragOver, setMainDragOver, autoAssignDrop, onOpen }) {
  return (
    <div
      className={`flex-1 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all min-h-96 relative
        ${mainDragOver
          ? "border-green-400 bg-green-50/40"
          : "border-yellow-500 hover:border-green-600 bg-yellow-50/40 hover:bg-green-50/30"}`}
      onClick={onOpen}
      onDragOver={(e) => { e.preventDefault(); setMainDragOver(true); }}
      onDragLeave={() => setMainDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setMainDragOver(false);
        autoAssignDrop(e.dataTransfer.files);
        onOpen();
      }}>
      <div className="absolute inset-3 border border-dashed border-yellow-400/25 pointer-events-none" />
      <svg width="56" height="56" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-35">
        <line x1="40" y1="75" x2="40" y2="10" stroke="#c8a84b" strokeWidth="2"/>
        <ellipse cx="40" cy="12" rx="5" ry="10" fill="#c8a84b"/>
        <ellipse cx="31" cy="22" rx="4" ry="8" fill="#7fb84e" transform="rotate(-20 31 22)"/>
        <ellipse cx="49" cy="22" rx="4" ry="8" fill="#7fb84e" transform="rotate(20 49 22)"/>
        <ellipse cx="27" cy="34" rx="4" ry="8" fill="#5a8a3c" transform="rotate(-25 27 34)"/>
        <ellipse cx="53" cy="34" rx="4" ry="8" fill="#5a8a3c" transform="rotate(25 53 34)"/>
      </svg>
      {mainDragOver
        ? <p className="font-sans font-bold text-sm uppercase tracking-widest text-green-600 mb-1">📥 Suelta los 3 TIFFs aquí</p>
        : <p className="font-sans font-bold text-sm uppercase tracking-widest text-stone-500 mb-1">Cargar bandas PixelWrench2</p>}
      <p className="font-sans text-xs text-stone-400">NIR · Red · Green — TIFF individuales · o arrastra los 3 a la vez</p>
    </div>
  );
}
