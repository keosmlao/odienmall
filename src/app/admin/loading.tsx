export default function AdminLoading() {
  return (
    <div className="flex min-h-[65vh] w-full flex-col items-center justify-center gap-4 py-12" aria-label="ກຳລັງໂຫຼດ">
      <div className="relative flex h-14 w-14 items-center justify-center">
        {/* Outer glowing pulsing circle */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500/10 opacity-75" />
        
        {/* Double-layered spinning rings */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-amber-500 animate-spin" />
      </div>
      
      {/* Loading message */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="animate-pulse text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          ODIENMALL STUDIO
        </span>
        <span className="text-sm font-bold text-slate-500 animate-pulse delay-75">
          ກຳລັງໂຫຼດຂໍ້ມູນ...
        </span>
      </div>
    </div>
  );
}
