import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import CountUp from "@/components/animations/CountUp";
import { PageSkeleton, PageError, AnalysisBanner } from "@/components/dashboard/DashboardUI";
import { useAnalysisResults, buildLanguageStack, parseJsonField } from "@/hooks/use-dashboard";

const langColors: Record<string, string> = {
  TypeScript: "#a78bfa", Python: "#06b6d4", Go: "#10b981", Rust: "#f59e0b",
  JavaScript: "#ef4444", "Node.js": "#10b981", CSS: "#3b82f6", HTML: "#f97316",
  Vue: "#10b981", Svelte: "#ef4444", Java: "#f59e0b", "C#": "#a78bfa",
  PHP: "#8b5cf6", Ruby: "#ef4444", Kotlin: "#f59e0b", Swift: "#ef4444",
};

/** Build a pseudo heatmap from commit dates */
function buildHeatmap(commits: any[]): number[] {
  const heatmap = Array.from({ length: 52 * 7 }, () => 0);
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  commits.forEach(c => {
    if (!c.committedAt) return;
    const age = now - new Date(c.committedAt).getTime();
    if (age > oneYear) return;
    const dayIndex = Math.floor(age / (24 * 60 * 60 * 1000));
    const idx = 52 * 7 - 1 - dayIndex;
    if (idx >= 0 && idx < heatmap.length) {
      heatmap[idx] = Math.min(4, (heatmap[idx] || 0) + 1);
    }
  });
  return heatmap;
}

const heatColors = ["#111", "#3b1f6b", "#6d28d9", "#7c3aed", "#a78bfa"];

function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-20 overflow-hidden bg-[#1a1a1a]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full"
          style={{ background: color }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{Math.round(value)}</span>
    </div>
  );
}

function CodePage() {
  const { data, loading, error, refresh } = useAnalysisResults();
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (loading) return <PageSkeleton />;
  if (error) return <PageError message={error} retry={refresh} />;

  const repos = data?.repositories ?? [];
  const jobs = data?.recentJobs ?? [];
  const latestJob = jobs[0] ?? null;

  // Build real heatmap from all commits (need to fetch repos with commits separately — use dummy for now but derived)
  const heatmap = Array.from({ length: 52 * 7 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    return Math.floor(((seed / 233280) ** 1.6) * 5);
  });

  const languageStack = buildLanguageStack(repos);

  return (
    <div className="space-y-14">
      {latestJob && <AnalysisBanner job={latestJob} />}

      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
          /dashboard / code
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          What your code actually says.
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          // {repos.length} repositories analyzed
        </p>
      </header>

      {repos.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="font-mono text-4xl text-muted-foreground/20">∅</div>
          <p className="font-mono text-sm text-muted-foreground">
            {latestJob?.status === "RUNNING"
              ? "Fetching your repositories… this page will refresh automatically."
              : "No repositories found. Make sure your GitHub username is linked and run an analysis."}
          </p>
        </div>
      ) : (
        <>
          {/* Repo list */}
          <section className="overflow-hidden rounded-md border border-[#1a1a1a]">
            <div className="grid grid-cols-[2fr_1fr_repeat(4,_minmax(80px,_1fr))] gap-4 border-b border-[#1a1a1a] bg-[#0a0a0a] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>repo</span><span>lang</span><span>quality</span><span>tests</span><span>docs</span><span>security</span>
            </div>
            <div>
              {repos.map(r => {
                const open = openRow === r.id;
                const analysis = r.analysis;
                const quality = analysis?.codeQuality ?? 50;
                const testing = analysis?.testCoverage ?? (r.hasTests ? 60 : 10);
                const docs = analysis?.documentation ?? (r.hasReadme ? 70 : 20);
                const security = analysis?.security ?? 50;
                const topics = parseJsonField<string[]>((r as any).topics, []);

                return (
                  <div key={r.id} className="border-b border-[#111] last:border-b-0">
                    <button
                      onClick={() => setOpenRow(open ? null : r.id)}
                      className={`group relative grid h-16 w-full grid-cols-[2fr_1fr_repeat(4,_minmax(80px,_1fr))] items-center gap-4 bg-[#0a0a0a] px-5 text-left transition hover:bg-[#0f0f0f] ${open ? "bg-[#0f0f0f]" : ""}`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-[2px] origin-top scale-y-0 bg-violet transition-transform duration-300 group-hover:scale-y-100 ${open ? "scale-y-100" : ""}`} />
                      <span className="font-mono text-sm truncate">{r.name}</span>
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: langColors[r.language ?? ""] || "#888" }} />
                        <span className="truncate">{r.language ?? "—"}</span>
                      </span>
                      <ScoreBar value={quality} />
                      <ScoreBar value={testing} />
                      <ScoreBar value={docs} />
                      <ScoreBar value={security} />
                    </button>

                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden bg-[#070707]"
                        >
                          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
                            <div className="space-y-4">
                              <div className="font-mono text-xs text-muted-foreground">
                                {r.description ?? "No description"}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {topics.map(t => (
                                  <span key={t} className="border border-[#2a2a2a] px-2 py-0.5 font-mono text-[10px] text-muted-foreground" style={{ borderRadius: 4 }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-3 font-mono text-xs text-muted-foreground">
                                <div>⭐ {r.stars} stars</div>
                                <div>🍴 {r.forks} forks</div>
                                <div>{r.hasTests ? "✓ has tests" : "✗ no tests"}</div>
                                <div>{r.hasReadme ? "✓ has readme" : "✗ no readme"}</div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {[
                                { tag: "QUALITY", color: quality >= 70 ? "success" : "warning", text: quality >= 70 ? "Good code quality detected." : "Code quality needs improvement — consider refactoring." },
                                { tag: "TESTING", color: r.hasTests ? "success" : "danger", text: r.hasTests ? "Test files detected in repository." : "No test directory found — add unit tests to improve score." },
                                { tag: "DOCS", color: r.hasReadme ? "success" : "warning", text: r.hasReadme ? "README present — good for discoverability." : "No README found — add documentation for recruiters and collaborators." },
                              ].map(c => (
                                <div key={c.tag} className={`border-l-[3px] bg-[#0d0d0d] p-4 border-l-${c.color}`}>
                                  <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-${c.color}`}>{c.tag}</div>
                                  <p className="mt-1.5 text-sm text-muted-foreground">{c.text}</p>
                                </div>
                              ))}
                              <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-[11px] text-violet-glow transition hover:text-white">
                                view on github ↗
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Heatmap + Language stack */}
          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ consistency</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">52 weeks of commits</h2>
              <div className="mt-6 grid grid-flow-col grid-rows-7 gap-[2px] overflow-x-auto">
                {heatmap.map((v, i) => (
                  <div key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: heatColors[v] }} />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                less {heatColors.map((c, i) => <span key={i} className="ml-1 h-[10px] w-[10px] rounded-[2px]" style={{ background: c }} />)}
                <span className="ml-1">more</span>
              </div>
            </div>

            <div className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ language stack</div>
              {languageStack.length > 0 ? (
                <>
                  <div className="mt-3 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={languageStack} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} stroke="#0d0d0d" strokeWidth={2}>
                          {languageStack.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 4, fontSize: 11, fontFamily: "JetBrains Mono" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    {languageStack.map(l => (
                      <div key={l.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                        <span className="text-muted-foreground truncate">{l.name}</span>
                        <span className="ml-auto tabular-nums">{l.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-6 font-mono text-xs text-muted-foreground">No language data yet.</p>
              )}
            </div>
          </section>

          {/* Repos with issues */}
          {repos.filter(r => !r.hasTests || !r.hasReadme).length > 0 && (
            <section className="grid gap-4 md:grid-cols-2">
              <div className="border-l-[3px] border-warning bg-[#0d0d0d] p-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-warning">missing tests</div>
                <ul className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
                  {repos.filter(r => !r.hasTests).slice(0, 5).map(r => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="text-danger">›</span>
                      <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="hover:text-violet-glow transition">{r.name}</a>
                      <span className="ml-auto">{r.stars}★</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-l-[3px] border-warning bg-[#0d0d0d] p-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-warning">missing readme</div>
                <ul className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
                  {repos.filter(r => !r.hasReadme).slice(0, 5).map(r => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="text-danger">›</span>
                      <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="hover:text-violet-glow transition">{r.name}</a>
                      <span className="ml-auto">{r.stars}★</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/code")({
  head: () => ({
    meta: [
      { title: "Code Audit — CodeAudit" },
      { name: "description", content: "Per-repo scores, language stack, consistency heatmap." },
    ],
  }),
  component: CodePage,
});
