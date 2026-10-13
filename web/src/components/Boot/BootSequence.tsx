import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStore } from "../../lib/store";

export default function BootSequence() {
  const booted = useStore((s) => s.booted);
  const setBooted = useStore((s) => s.setBooted);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (booted) return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(() => setBooted(true), 400);
          return 100;
        }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(t);
  }, [booted, setBooted]);

  return (
    <AnimatePresence>
      {!booted && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[1000] bg-black flex items-center justify-center"
        >
          <div className="relative flex flex-col items-center">
            {/* Particle ring converging */}
            <div className="relative w-32 h-32 mb-10">
              <motion.div
                className="absolute inset-0 rounded-full border border-white/20"
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-white/40"
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.0, delay: 0.2, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ opacity: 0, letterSpacing: "0.5em" }}
                  animate={{ opacity: 1, letterSpacing: "0.25em" }}
                  transition={{ duration: 1.0, delay: 0.5 }}
                  className="text-white/90 text-sm font-light tracking-widest"
                >
                  F.R.I.D.A.Y.
                </motion.span>
              </div>
            </div>

            {/* Thin progress bar */}
            <div className="w-48 h-px bg-white/10 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-white/60"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-white/30 text-[10px] tracking-widest mt-4 font-mono">
              {progress}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
