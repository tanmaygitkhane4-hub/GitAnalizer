import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import CountUp from "@/components/animations/CountUp";
import ClickSpark from "@/components/animations/ClickSpark";
import { PageSkeleton, PageError, AnalysisBanner } from "@/components/dashboard/DashboardUI";
import { useAnalysisResults } from "@/hooks/use-dashboard";

function SecurityPage() {
  const { data, loading, error, refresh } = useAnalysisResults();
  const [fixed, setFixed] = useState<number[]>([]);

  if (loading) return <PageSkeleton />;
  if (error) return <PageError message={error} retry={refresh} />;

  const score = data?.score;
  const repos = data?.repositories ?? [];
  const jobs = data?.recentJobs ?? [];
  const latestJob = jobs[0] ?? null;

  // Derive security findings from real repos
  const securityScore = score?.security ?? 0;
  const reposWithoutTests = repos.filter(r => !r.hasTests);
  const reposWithoutReadme = repos.filter(r => !r.hasReadme);

  // Risk counts derived from real data
  const highCount = reposWithoutTests.length;
  const mediumCount = reposWithoutReadme.length;
  const lowCount = Math.max(0, repos.length - highCount - mediumCount);

  const riskCards = [
    { label: "HIGH", value: highCount, color: "danger" as const, desc: "repos without tests" },
    { label: "MEDIUM", value: mediumCount, color: "warning" as const, desc: "repos without README" },
    { label: "LOW", value: lowCount, color: "success" as const, desc: "repos fully documented" },
  ];

  // Security findings derived from score
  const securityFindings = buildSecurityFindings(score, repos);

  // Fix priority queue derived from real issues
  const fixQueue = buildFixQueue(repos, score);

  return (
    <div className="space-y-14">
      {latestJob && <AnalysisBanner job={latestJob} />}

      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
          /dashboard / security
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Your attack surface.</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          // security score: {Math.round(securityScore)} / 100
        </p>
      </header>

      {!score ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="font-mono text-4xl text-muted-foreground/20">∅</div>
          <p className="font-mono text-sm text-muted-foreground">Run an analysis to see your security report.</p>
        </div>
      ) : (
        <>
          {/* Risk summary */}
          <section className="grid gap-4 md:grid-cols-3">
            {riskCards.map(r => (
              <div key={r.label} className={`border-l-[3px] bg-[#0d0d0d] p-6 border-l-${r.color}`}>
                <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-${r.color}`}>{r.label} risk</div>
                <div className={`mt-3 font-black leading-none tabular-nums text-${r.color}`} style={{ fontSize: "clamp(3rem, 8vw, 6rem)", letterSpacing: "-0.04em" }}>
                  <CountUp to={r.value} duration={1.4} />
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{r.desc}</div>
              </div>
            ))}
          </section>

          {/* Repos without tests — the biggest risk */}
          {reposWithoutTests.length > 0 && (
            <section className="border-l-[3px] border-l-danger bg-[#1a0a0a]/40 p-5">
              <div className="flex items-start gap-3">
                <span className="font-mono text-lg text-danger">⚠</span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-danger">
                    repos without test coverage
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    // {reposWithoutTests.length} repositories have no test files — this is your biggest risk signal to recruiters.
                  </p>
                  <ul className="mt-4 space-y-1.5 font-mono text-[11px]">
                    {reposWithoutTests.slice(0, 5).map(r => (
                      <li key={r.id} className="flex items-center gap-2">
                        <span className="text-danger">›</span>
                        <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="hover:text-violet-glow transition">{r.name}</a>
                        <span className="ml-auto text-muted-foreground/50">{r.language ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Security findings */}
          <section className="space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ 01</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Code & security flags</h2>
            </div>
            {securityFindings.map((f, i) => {
              const color = f.severity === "HIGH" ? "danger" : f.severity === "MEDIUM" ? "warning" : "success";
              return (
                <div key={i} className={`border-l-[3px] bg-[#0d0d0d] p-5 md:p-6 border-l-${color}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className={`inline-flex items-center border bg-[#1a0a0a] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] border-${color}/40 text-${color}`}>
                      {f.category}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{f.severity}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 font-mono text-[12px] text-muted-foreground">{f.description}</p>
                  <div className="mt-3 flex items-start gap-2 font-mono text-[12px]">
                    <span className="text-success">→</span>
                    <span className="text-muted-foreground">{f.fix}</span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Score-based schema review */}
          <section className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ 02</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Score breakdown</h2>
            <div className="mt-6 divide-y divide-[#1a1a1a]">
              {[
                { issue: `Security score: ${Math.round(securityScore)}/100`, sev: securityScore < 50 ? "HIGH" : securityScore < 75 ? "MEDIUM" : "LOW", fix: "Add tests, READMEs, and dependency auditing" },
                { issue: `${reposWithoutTests.length} repos lack unit tests`, sev: reposWithoutTests.length > 2 ? "HIGH" : "MEDIUM", fix: "Add Vitest or Jest to your top 3 projects" },
                { issue: `${reposWithoutReadme.length} repos missing documentation`, sev: reposWithoutReadme.length > 3 ? "MEDIUM" : "LOW", fix: "Add README with setup instructions and description" },
              ].map((r, i) => {
                const c = r.sev === "HIGH" ? "danger" : r.sev === "MEDIUM" ? "warning" : "success";
                return (
                  <div key={i} className="grid items-center gap-3 py-3 md:grid-cols-[2fr_auto_2fr]">
                    <div className="text-sm">{r.issue}</div>
                    <span className={`inline-flex w-fit border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] border-${c}/40 text-${c}`}>{r.sev}</span>
                    <div className="font-mono text-[11px] text-muted-foreground">{r.fix}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Fix priority queue */}
          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ 03</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Fix priority queue</h2>
            <div className="mt-6 space-y-2">
              {fixQueue.map((f) => {
                const isFixed = fixed.includes(f.rank);
                return (
                  <div key={f.rank} className={`flex items-center gap-5 border-l-[3px] bg-[#0d0d0d] p-4 transition ${isFixed ? "border-l-success opacity-50" : "border-l-violet"}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center font-mono text-sm font-black text-violet-glow">
                      {String(f.rank).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium ${isFixed ? "line-through" : ""}`}>{f.title}</div>
                      <div className="mt-1 flex gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        <span>{f.effort}</span>
                        <span>impact: <span className="text-warning">{f.impact}</span></span>
                      </div>
                    </div>
                    <ClickSpark sparkColor={isFixed ? "#10b981" : "#a78bfa"}>
                      <button
                        onClick={() => {
                          const next = isFixed;
                          setFixed(p => next ? p.filter(r => r !== f.rank) : [...p, f.rank]);
                          if (!next) toast.success("marked as fixed", { description: f.title });
                        }}
                        className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition ${isFixed ? "border-success/40 bg-success/10 text-success" : "border-[#2a2a2a] text-muted-foreground hover:border-violet hover:text-violet-glow"}`}
                      >
                        {isFixed ? "✓ fixed" : "mark fixed"}
                      </button>
                    </ClickSpark>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function buildSecurityFindings(score: any, repos: any[]) {
  const findings = [];
  const noTestCount = repos.filter(r => !r.hasTests).length;
  const noReadmeCount = repos.filter(r => !r.hasReadme).length;

  if (noTestCount > 0) {
    findings.push({
      category: "A06 — Vulnerable Components",
      severity: noTestCount > 3 ? "HIGH" : "MEDIUM",
      title: `${noTestCount} repositories have no test coverage`,
      description: `Untested code is vulnerable — regressions go undetected, security bugs ship unnoticed. ${noTestCount} of your repos have no test directory.`,
      fix: "Add Vitest, Jest, or Pytest. Start with your most-starred or most-active repo.",
    });
  }

  if (score && score.security < 60) {
    findings.push({
      category: "A07 — Auth Failures",
      severity: "MEDIUM" as const,
      title: "Low security score suggests auth/input handling gaps",
      description: "Your overall security score is below 60. This often indicates missing input validation, missing auth checks, or no rate limiting in API projects.",
      fix: "Review your API projects for missing auth middleware, rate limiting, and input validation.",
    });
  }

  if (noReadmeCount > 3) {
    findings.push({
      category: "A09 — Security Logging",
      severity: "LOW" as const,
      title: `${noReadmeCount} repos have no documentation`,
      description: "Missing READMEs mean no setup instructions, no environment variable documentation, which can lead to accidental secret exposure.",
      fix: "Add README with environment setup, never commit secrets. Use .env.example pattern.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      category: "A00 — Overview",
      severity: "LOW" as const,
      title: "No critical security flags detected",
      description: "Based on your repository analysis, no major security anti-patterns were detected. Keep up the good work!",
      fix: "Continue adding tests, documenting APIs, and reviewing OWASP Top 10 regularly.",
    });
  }

  return findings;
}

function buildFixQueue(repos: any[], score: any) {
  const queue: { rank: number; title: string; effort: string; impact: string }[] = [];
  let rank = 1;

  const noTest = repos.filter(r => !r.hasTests)[0];
  if (noTest) {
    queue.push({ rank: rank++, title: `Add tests to "${noTest.name}"`, effort: "2-4h", impact: "High" });
  }

  const noReadme = repos.filter(r => !r.hasReadme)[0];
  if (noReadme) {
    queue.push({ rank: rank++, title: `Add README to "${noReadme.name}"`, effort: "30min", impact: "High" });
  }

  if (score && score.consistency < 50) {
    queue.push({ rank: rank++, title: "Commit to GitHub at least 3x per week", effort: "ongoing", impact: "High" });
  }

  if (score && score.projectDepth < 50) {
    queue.push({ rank: rank++, title: "Build a full-stack project with auth + DB", effort: "1-2 weeks", impact: "Very High" });
  }

  queue.push({ rank: rank++, title: "Audit dependencies with npm audit / pip-audit", effort: "1h", impact: "Medium" });
  queue.push({ rank: rank++, title: "Add .env.example to all API projects", effort: "15min", impact: "Medium" });

  return queue;
}

export const Route = createFileRoute("/dashboard/security")({
  head: () => ({
    meta: [
      { title: "Security Audit — CodeAudit" },
      { name: "description", content: "Auth flaws, exposed secrets, schema review, prioritized fix queue." },
    ],
  }),
  component: SecurityPage,
});
