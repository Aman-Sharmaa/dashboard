// Pure CSS background blobs ~ no framer-motion, no JS runtime cost
export function HomeBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute bottom-0 left-0 w-full h-2/3">
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full"
          style={{
            backgroundColor: "rgba(241, 31, 31, 0.18)",
            filter: "blur(120px)",
            animation: "blob-fade 2s ease-out forwards",
            opacity: 0,
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{
            backgroundColor: "rgba(241, 31, 31, 0.18)",
            filter: "blur(100px)",
            animation: "blob-fade 2s ease-out 0.3s forwards",
            opacity: 0,
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            backgroundColor: "rgba(241, 31, 31, 0.13)",
            filter: "blur(90px)",
            animation: "blob-fade 2s ease-out 0.6s forwards",
            opacity: 0,
          }}
        />
      </div>

      <style>{`
        @keyframes blob-fade {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
