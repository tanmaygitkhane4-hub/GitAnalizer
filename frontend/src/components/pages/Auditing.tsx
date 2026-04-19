import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";

const lines = [
  { text: "Fetching GitHub profile...", section: "CODE" },
  { text: "Scanning 12 repositories...", section: "CODE" },
  { text: "Analyzing code quality...", section: "CODE" },
  { text: "Checking test coverage...", section: "CODE" },
  { text: "Auditing UI/UX patterns...", section: "UIUX" },
  { text: "Running security audit...", section: "SECURITY" },
  { text: "Cross-referencing job market...", section: "JOBS" },
  { text: "Building 90-day roadmap...", section: "ROADMAP" },
  { text: "Rewriting resume bullets...", section: "RESUME" },
  { text: "Compiling your brutal truth...", section: "RESUME" },
];

const sections = ["CODE", "UIUX", "SECURITY", "JOBS", "ROADMAP", "RESUME"] as const;

export default function Auditing() {
  const navigate = useNavigate();
  const [lineIdx, setLineIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [flickerIdx, setFlickerIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lineIdx >= lines.length) {
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineIdx((i) => i + 1), 850);
    return () => clearTimeout(t);
  }, [lineIdx, navigate]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Random data flicker
  useEffect(() => {
    const t = setInterval(() => {
      if (lineIdx > 0) {
        const i = Math.floor(Math.random() * lineIdx);
        setFlickerIdx(i);
        setTimeout(() => setFlickerIdx(null), 400);
      }
    }, 3500);
    return () => clearInterval(t);
  }, [lineIdx]);

  const progress = Math.min(100, (lineIdx / lines.length) * 100);
  const completedSections = new Set(lines.slice(0, lineIdx).map((l) => l.section));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-20 h-[2px]">
        <motion.div
          className="h-full bg-violet"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Decorative giant seconds counter */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-10 z-0 text-center font-mono font-black leading-none text-white/[0.05] select-none"
        style={{ fontSize: "8rem" }}
      >
        {String(seconds).padStart(3, "0")}
      </div>

      {/* Left vertical section list */}
      <div className="fixed left-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-4 md:flex">
        {sections.map((s) => {
          const done = completedSections.has(s);
          return (
            <div key={s} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]">
              <div className="relative h-px w-10 bg-[#1a1a1a] overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-violet"
                  initial={{ width: 0 }}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className={done ? "text-violet-glow" : "text-muted-foreground/40"}>{s}</span>
            </div>
          );
        })}
      </div>

      {/* Center terminal log */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20 md:px-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
          // analyzing — {seconds}s elapsed
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          Compiling your brutal truth.
        </h1>

        <div className="mt-10 space-y-1 font-mono text-[15px] leading-[2]">
          {lines.slice(0, lineIdx + 1).map((l, i) => {
            const done = i < lineIdx;
            const active = i === lineIdx && lineIdx < lines.length;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={`relative flex items-center gap-3 px-3 ${active ? "bg-violet/[0.03]" : ""} ${flickerIdx === i ? "flicker" : ""}`}
              >
                {done && <span className="text-success">[✓]</span>}
                {active && <span className="text-violet-glow blink-caret">[...]</span>}
                <span className={done ? "text-muted-foreground" : "text-foreground"}>{l.text}</span>
              </motion.div>
            );
          })}
        </div>

        {lineIdx >= lines.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 font-mono text-xs text-violet-glow"
          >
            // done. routing to dashboard...
          </motion.div>
        )}
      </div>
    </div>
  );
}
