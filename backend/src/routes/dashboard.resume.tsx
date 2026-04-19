import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import CountUp from "@/components/animations/CountUp";
import ClickSpark from "@/components/animations/ClickSpark";
import { PageSkeleton, PageError, AnalysisBanner, CircularProgress, SectionHeading } from "@/components/dashboard/DashboardUI";
import { useAnalysisResults, buildLanguageStack } from "@/hooks/use-dashboard";

function ResumePage() {
  const { data, loading, error, refresh } = useAnalysisResults();
  const [copied, setCopied] = useState(false);

  if (loading) return <PageSkeleton />;
  if (error) return <PageError message={error} retry={refresh} />;

  const score = data?.score;
  const repos = data?.repositories ?? [];
  const jobs = data?.recentJobs ?? [];
  const latestJob = jobs[0] ?? null;

  // Lead / remove recommendations derived from real repos
  const leadRepos = repos
    .filter(r => r.stars > 0 || r.hasTests || r.hasReadme)
    .sort((a, b) => (b.stars - a.stars) + (b.hasTests ? 1 : 0) - (a.hasTests ? 1 : 0))
    .slice(0, 3)
    .map(r => ({
      name: r.name,
      reason: [
        r.stars > 0 ? `${r.stars} stars` : "",
        r.hasTests ? "has tests" : "",
        r.hasReadme ? "documented" : "",
      ].filter(Boolean).join(", "),
      verdict: "lead" as const,
    }));

  const removeRepos = repos
    .filter(r => !r.hasTests && !r.hasReadme && r.stars === 0)
    .slice(0, 3)
    .map(r => ({
      name: r.name,
      reason: "no tests, no README, 0 stars — won't impress recruiters",
      verdict: "remove" as const,
    }));

  const repoRecommendations = [...leadRepos, ...removeRepos];

  // Build resume bullets from real repos
  const langStack = buildLanguageStack(repos);
  const resumeBullets = buildResumeBullets(repos, langStack);

  // ATS score based on real metrics
  const atsScore = score
    ? Math.min(95, Math.round(
        (score.codeQuality * 0.3) +
        (score.projectDepth * 0.3) +
        (score.consistency * 0.2) +
        (score.uiUx * 0.2)
      ))
    : 0;

  const atsColor = atsScore < 60 ? "#ef4444" : atsScore < 80 ? "#f59e0b" : "#10b981";

  // Keyword gap: detected langs vs common resume keywords
  const detectedLangs = new Set(langStack.map(l => l.name));
  const targetKeywords = ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis", "Next.js", "Kubernetes"];
  const inResume = [...detectedLangs].filter(l => targetKeywords.includes(l));
  const inJobs = targetKeywords;

  const copyAll = async () => {
    const text = resumeBullets.map(b => `• ${b.rewritten}`).join("\n");
    try { await navigator.clipboard.writeText(text); } catch { }
    setCopied(true);
    toast.success("copied to clipboard", { description: `${resumeBullets.length} bullets` });
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-14">
      {latestJob && <AnalysisBanner job={latestJob} />}

      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
          /dashboard / resume
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          Your resume, rewritten by your code.
        </h1>
      </header>

      {!score ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="font-mono text-4xl text-muted-foreground/20">∅</div>
          <p className="font-mono text-sm text-muted-foreground">Run an analysis to generate your resume suggestions.</p>
        </div>
      ) : (
        <>
          {/* Lead / Remove */}
          {repoRecommendations.length > 0 && (
            <section>
              <SectionLabel kicker="01" title="Lead with — and remove" />
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {repoRecommendations.map(r => {
                  const lead = r.verdict === "lead";
                  return (
                    <div key={r.name} className={`flex items-center gap-5 border-l-[3px] bg-[#0a0a0a] p-5 ${lead ? "border-l-success" : "border-l-danger"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm">{r.name}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{r.reason}</div>
                      </div>
                      <span className={`shrink-0 border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${lead ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"}`} style={{ borderRadius: 4 }}>
                        {lead ? "lead with" : "remove"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Before / After bullets */}
          {resumeBullets.length > 0 && (
            <section>
              <SectionLabel kicker="02" title="Before / After" />
              <div className="mt-6 space-y-3">
                {resumeBullets.map((b, i) => (
                  <div key={i} className="border border-[#1a1a1a] bg-[#0d0d0d] p-5">
                    <div className="grid items-center gap-0 md:grid-cols-[1fr_auto_1fr]">
                      <div className="relative p-4">
                        <div className="pointer-events-none absolute inset-0 bg-danger/[0.03]" />
                        <div className="relative font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">// before</div>
                        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground line-through decoration-danger/40">{b.original}</p>
                      </div>
                      <div className="hidden md:flex flex-col items-center gap-2 self-stretch border-l border-r border-[#1a1a1a] px-2">
                        <div className="flex-1 border-l border-dashed border-[#2a2a2a]" />
                        <span className="border border-[#2a2a2a] bg-[#0d0d0d] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">rewritten</span>
                        <div className="flex-1 border-l border-dashed border-[#2a2a2a]" />
                      </div>
                      <div className="relative p-4">
                        <div className="pointer-events-none absolute inset-0 bg-success/[0.03]" />
                        <div className="relative font-mono text-xs uppercase tracking-[0.15em] text-success/80">// after</div>
                        <p className="relative mt-2 text-sm leading-relaxed text-foreground">{b.rewritten}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Keyword gap */}
          <section className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
            <SectionLabel kicker="03" title="Keyword gap" small />
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">in your repos</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {inResume.map(k => (
                    <span key={k} className="border border-success/40 px-3 py-1 font-mono text-[11px] text-foreground" style={{ borderRadius: 4 }}>{k}</span>
                  ))}
                  {inResume.length === 0 && <span className="font-mono text-xs text-muted-foreground">No top keywords detected yet.</span>}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-warning/80">target keywords (in job postings)</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {inJobs.map(k => {
                    const present = inResume.includes(k);
                    return (
                      <span key={k} className={`border px-3 py-1 font-mono text-[11px] ${present ? "border-success/40 text-foreground" : "border-warning/40 bg-warning/10 text-warning"}`} style={{ borderRadius: 4 }}>
                        {k}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ATS score */}
          <section className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <SectionLabel kicker="04" title="ATS score" small />
              <div className="mt-6">
                <CircularProgress value={atsScore} size={200} color={atsColor} />
              </div>
            </div>
            <div className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ why it isn't higher</div>
              <ul className="mt-4 space-y-2.5 font-mono text-[12px] text-muted-foreground">
                {(inJobs.filter(k => !inResume.includes(k))).slice(0, 4).map(k => (
                  <li key={k}>› Missing keyword: <span className="text-warning">{k}</span></li>
                ))}
                {!score || score.consistency < 50 ? <li>› Commit history too sparse — shows inconsistency</li> : null}
                {!score || score.codeQuality < 60 ? <li>› Low code quality score may signal inexperience</li> : null}
                {repos.filter(r => !r.hasReadme).length > 3 ? <li>› {repos.filter(r => !r.hasReadme).length} repos missing README — hurts documentation score</li> : null}
                <li>› Add measurable outcomes to project descriptions (e.g. "reduced load time by 40%")</li>
              </ul>
            </div>
          </section>

          {/* Copy CTA */}
          {resumeBullets.length > 0 && (
            <section className="flex flex-col items-center gap-4 pt-4">
              <ClickSpark sparkCount={14} sparkRadius={28}>
                <button onClick={copyAll} className="border border-violet px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.25em] text-violet-glow transition hover:bg-violet hover:text-white hover:shadow-[0_0_30px_#7c3aed60]">
                  {copied ? "✓ copied" : "copy all rewritten bullets"}
                </button>
              </ClickSpark>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function buildResumeBullets(repos: any[], langStack: any[]) {
  if (repos.length === 0) return [];
  const bullets = [];

  // Top starred repo
  const topRepo = repos.sort((a, b) => b.stars - a.stars)[0];
  if (topRepo) {
    bullets.push({
      original: `Worked on ${topRepo.name} project using various technologies.`,
      rewritten: `Built and maintained ${topRepo.name} — ${topRepo.stars > 0 ? `${topRepo.stars}★ on GitHub` : "deployed project"} — written in ${topRepo.language ?? "multiple languages"}${topRepo.hasTests ? " with test coverage" : ""}.`,
    });
  }

  // Language stack bullet
  const langs = langStack.slice(0, 4).map(l => l.name).join(", ");
  if (langs) {
    bullets.push({
      original: "Experienced in multiple programming languages and frameworks.",
      rewritten: `Proficient in ${langs} with hands-on projects across ${repos.length} public repositories demonstrating full-stack capability.`,
    });
  }

  // Testing bullet
  const testedRepos = repos.filter(r => r.hasTests);
  if (testedRepos.length > 0) {
    bullets.push({
      original: "Wrote some tests for code quality.",
      rewritten: `Implemented automated test suites across ${testedRepos.length} project${testedRepos.length > 1 ? "s" : ""} including ${testedRepos.slice(0, 2).map(r => r.name).join(" and ")}, ensuring reliability and reducing regression risk.`,
    });
  }

  // Total commits / activity
  const totalCommits = repos.reduce((s, r) => s + (r._count?.commits ?? 0), 0);
  if (totalCommits > 0) {
    bullets.push({
      original: "Active GitHub contributor with regular code commits.",
      rewritten: `Consistently shipped code across ${repos.length} repositories with ${totalCommits}+ commits tracked — demonstrating active development habits and iterative delivery.`,
    });
  }

  return bullets.slice(0, 4);
}

function SectionLabel({ kicker, title, small = false }: { kicker: string; title: string; small?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">/ {kicker}</div>
      <h2 className={`mt-2 font-black tracking-tight ${small ? "text-2xl" : "text-2xl md:text-3xl"}`}>{title}</h2>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/resume")({
  head: () => ({
    meta: [
      { title: "Resume — CodeAudit" },
      { name: "description", content: "Your resume rewritten from your actual commits, with ATS score and keyword gap." },
    ],
  }),
  component: ResumePage,
});
