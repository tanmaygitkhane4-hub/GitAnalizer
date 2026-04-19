import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CountUp from "@/components/animations/CountUp";
import ClickSpark from "@/components/animations/ClickSpark";
import { PageSkeleton, PageError, AnalysisBanner, SectionHeading } from "@/components/dashboard/DashboardUI";
import { useLatestReport, useAnalysisResults } from "@/hooks/use-dashboard";

function RoadmapPage() {
  const { data: report, loading, error, refresh } = useLatestReport();
  const { data: analysis } = useAnalysisResults();
  const [openWeek, setOpenWeek] = useState<string | null>("Week 1-2");
  const [done, setDone] = useState<string[]>([]);

  if (loading) return <PageSkeleton />;
  if (error) return <PageError message={error} retry={refresh} />;

  const jobs = analysis?.recentJobs ?? [];
  const latestJob = jobs[0] ?? null;
  const score = analysis?.score;
  const roadmapData = report?.roadmap ?? [];
  const gap = report?.gapAnalysis;

  // Build weekly tasks from roadmap
  const weeklyTasks = roadmapData.map((p: any, i: number) => ({
    week: `Week ${p.week}`,
    focus: p.focus,
    build: p.tasks.filter((_: any, j: number) => j % 3 === 0),
    read: p.tasks.filter((_: any, j: number) => j % 3 === 1),
    fix: p.tasks.filter((_: any, j: number) => j % 3 === 2),
  }));

  const allTasks = useMemo(
    () => weeklyTasks.flatMap((w: any) => [...w.build, ...w.read, ...w.fix].map((t: string) => `${w.week}|${t}`)),
    [weeklyTasks]
  );
  const completed = done.length;

  // Skill ROI list from gap analysis
  const skillROI = buildSkillROI(score, gap);

  return (
    <div className="space-y-14">
      {latestJob && <AnalysisBanner job={latestJob} />}

      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
          /dashboard / roadmap
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Your next 90 days.</h1>
        {gap && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            // gap: {gap.level} → {gap.targetLevel} · {gap.gaps?.length ?? 0} areas to improve
          </p>
        )}
      </header>

      {roadmapData.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="font-mono text-4xl text-muted-foreground/20">∅</div>
          <p className="font-mono text-sm text-muted-foreground">Run an analysis to generate your personalized roadmap.</p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <section className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6 md:p-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ timeline</div>
            <svg viewBox="0 0 1000 60" className="mt-4 block h-16 w-full">
              <line x1="40" y1="30" x2="960" y2="30" stroke="#1a1a1a" strokeWidth="2" />
              <motion.line x1="40" y1="30" x2="960" y2="30" stroke="#a78bfa" strokeWidth="2"
                strokeDasharray="920" initial={{ strokeDashoffset: 920 }}
                whileInView={{ strokeDashoffset: 0 }} viewport={{ once: true }}
                transition={{ duration: 1.4, ease: "easeInOut" }} />
              {[40, 340, 660, 960].map((x, i) => (
                <motion.circle key={i} cx={x} cy={30} r={i === 0 ? 9 : 7}
                  fill={i === 0 ? "#a78bfa" : "#0d0d0d"} stroke="#a78bfa" strokeWidth="2"
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.25, duration: 0.4, ease: "backOut" }} />
              ))}
            </svg>
            <div className="mt-2 grid grid-cols-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="text-violet-glow">today</span><span>day 30</span><span>day 60</span><span>day 90</span>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {roadmapData.map((p: any) => (
                <div key={p.week} className="border-l-[2px] border-violet bg-[#0a0a0a] p-5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-glow">
                    weeks {p.week} · {p.focus}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.tasks.map((g: string) => (
                      <li key={g} className="flex gap-2">
                        <span className="text-violet-glow">›</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Gap analysis */}
          {gap?.gaps?.length > 0 && (
            <section>
              <SectionHeading kicker="01" title="Skills ranked by ROI" />
              <div className="mt-6 space-y-2">
                {skillROI.map((s, i) => (
                  <div key={s.skill} className="flex items-center gap-6 border-l-[2px] border-[#1a1a1a] bg-[#0a0a0a] p-5 transition hover:border-violet hover:bg-[#0f0f0f]">
                    <div className="select-none font-mono text-5xl font-black tabular-nums text-violet-glow/15">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{s.skill}</div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{s.why}</div>
                    </div>
                    <span className={`shrink-0 border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${s.roi === "High" ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"}`} style={{ borderRadius: 4 }}>
                      {s.roi} roi
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weekly tasks */}
          {weeklyTasks.length > 0 && (
            <section>
              <div className="flex items-end justify-between">
                <SectionHeading kicker="02" title="Weekly tasks" />
                <div className="font-mono text-xs text-muted-foreground">
                  <span className="text-violet-glow tabular-nums"><CountUp to={completed} /></span> / {allTasks.length} done
                </div>
              </div>
              <div className="mt-4 h-[2px] overflow-hidden bg-[#1a1a1a]">
                <motion.div className="h-full bg-violet"
                  animate={{ width: allTasks.length > 0 ? `${(completed / allTasks.length) * 100}%` : "0%" }}
                  transition={{ duration: 0.4 }} />
              </div>
              <div className="mt-6 space-y-2">
                {weeklyTasks.map((w: any) => {
                  const open = openWeek === w.week;
                  return (
                    <div key={w.week} className="overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a]">
                      <button onClick={() => setOpenWeek(open ? null : w.week)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#0f0f0f]">
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{w.week} — {w.focus}</span>
                        <span className="text-violet-glow">{open ? "−" : "+"}</span>
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                            <div className="grid gap-6 border-t border-[#1a1a1a] p-5 md:grid-cols-3">
                              {([
                                { label: "build", items: w.build, color: "violet-glow" },
                                { label: "read", items: w.read, color: "cyan" },
                                { label: "fix", items: w.fix, color: "warning" },
                              ] as const).map(col => (
                                <div key={col.label}>
                                  <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-${col.color}`}>/ {col.label}</div>
                                  <ul className="mt-3 space-y-2 text-sm">
                                    {col.items.map((t: string) => {
                                      const id = `${w.week}|${t}`;
                                      const isDone = done.includes(id);
                                      return (
                                        <li key={t}>
                                          <ClickSpark sparkColor="#10b981">
                                            <label className="flex cursor-pointer items-start gap-2">
                                              <input type="checkbox" checked={isDone}
                                                onChange={() => {
                                                  const next = !isDone;
                                                  setDone(p => next ? [...p, id] : p.filter(x => x !== id));
                                                  if (next) toast.success("task complete", { description: t });
                                                }}
                                                className="mt-0.5 h-4 w-4 accent-[var(--violet)]" />
                                              <span className={isDone ? "text-success line-through" : ""}>{t}</span>
                                            </label>
                                          </ClickSpark>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="flex justify-end">
            <ClickSpark sparkCount={12}>
              <button
                onClick={() => {
                  const text = roadmapData.map((p: any) => `${p.focus} (wk ${p.week}):\n${p.tasks.map((t: string) => `  - ${t}`).join("\n")}`).join("\n\n");
                  navigator.clipboard.writeText(text).catch(() => {});
                  toast.success("Roadmap copied to clipboard");
                }}
                className="border border-violet px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-violet-glow transition hover:bg-violet hover:text-white hover:shadow-[0_0_30px_#7c3aed60]"
              >
                ↓ export roadmap
              </button>
            </ClickSpark>
          </div>
        </>
      )}
    </div>
  );
}

function buildSkillROI(score: any, gap: any) {
  const skills = [];
  if (!score) return DEFAULT_SKILL_ROI;
  if (score.codeQuality < 60) skills.push({ skill: "Testing (Vitest/Jest)", why: "Boosts code quality score and is top interviewer signal", roi: "High" as const });
  if (score.consistency < 50) skills.push({ skill: "Daily coding habits", why: "Commit frequency directly impacts consistency score", roi: "High" as const });
  if (score.security < 60) skills.push({ skill: "Security fundamentals (OWASP)", why: "Security gaps reduce composite score significantly", roi: "High" as const });
  if (score.uiUx < 50) skills.push({ skill: "Documentation (README + JSDoc)", why: "Improves discoverability and UI/UX score", roi: "High" as const });
  if (score.projectDepth < 50) skills.push({ skill: "Build a full-stack project", why: "Project depth is heavily weighted in composite", roi: "High" as const });
  skills.push({ skill: "TypeScript (strict mode)", why: "TypeScript is top of hiring criteria at most companies", roi: "High" as const });
  skills.push({ skill: "System design basics", why: "Required for mid-level+ interviews", roi: "Medium" as const });
  return skills.slice(0, 6);
}

const DEFAULT_SKILL_ROI = [
  { skill: "TypeScript", why: "Top of hiring criteria at most companies", roi: "High" as const },
  { skill: "Testing (Vitest/Jest)", why: "Signal of engineering maturity", roi: "High" as const },
  { skill: "System design", why: "Required for senior+ interviews", roi: "High" as const },
  { skill: "CI/CD (GitHub Actions)", why: "Fast ROI — 1-2 days to learn", roi: "Medium" as const },
  { skill: "Containerization (Docker)", why: "Expected by most engineering teams", roi: "Medium" as const },
];

export const Route = createFileRoute("/dashboard/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — CodeAudit" },
      { name: "description", content: "Your 30/60/90 plan, ranked by skill ROI, with weekly tasks." },
    ],
  }),
  component: RoadmapPage,
});
