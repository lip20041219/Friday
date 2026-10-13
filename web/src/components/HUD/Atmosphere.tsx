import { useEffect, useRef } from "react";

/**
 * DOT MATRIX ATMOSPHERE — black bg + dot grid + scanline + cursor glow.
 */
export default function Atmosphere() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = glowRef.current;
      if (!el) return;
      el.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Moving scanline */}
      <div
        className="absolute left-0 right-0 h-[2px] opacity-15"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          animation: "scanline_move 8s linear infinite",
        }}
      />

      {/* Cursor follow glow */}
      <div
        ref={glowRef}
        className="absolute w-[300px] h-[300px] rounded-full opacity-[0.07] transition-transform duration-300 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      <style>{`
        @keyframes scanline_move {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
