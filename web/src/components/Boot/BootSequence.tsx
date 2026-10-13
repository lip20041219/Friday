import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store";

export default function BootSequence() {
  const booted = useStore((s) => s.booted);
  const setBooted = useStore((s) => s.setBooted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (booted) return;
    // Fallback: force boot after 55 seconds max
    const fallback = setTimeout(() => setBooted(true), 55000);
    return () => clearTimeout(fallback);
  }, [booted, setBooted]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    // Show FRIDAY logo for 2 seconds, then boot
    setTimeout(() => setBooted(true), 2000);
  };

  return (
    <AnimatePresence>
      {!booted && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0 }}
          className="fixed inset-0 z-[1000] bg-black overflow-hidden"
        >
          {/* Boot video */}
          <motion.video
            ref={videoRef}
            src="/boot.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            initial={{ opacity: 1 }}
            animate={{ opacity: videoEnded ? 0 : 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* FRIDAY logo fade-in after video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: videoEnded ? 1 : 0,
              scale: videoEnded ? 1 : 0.95,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <div className="text-center">
              <div className="text-white/90 text-2xl font-mono tracking-[0.4em] mb-4">
                F.R.I.D.A.Y.
              </div>
              <div className="text-white/40 text-xs font-mono tracking-[0.2em]">
                LOCAL AI MISSION CONTROL
              </div>
            </div>
          </motion.div>

          {/* Skip button */}
          <button
            onClick={() => setBooted(true)}
            className="absolute bottom-6 right-6 text-white/30 text-xs font-mono hover:text-white/60 transition-colors"
          >
            SKIP ▸
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
