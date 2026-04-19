import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import CountUp from "@/components/animations/CountUp";
import { PageSkeleton, PageError, AnalysisBanner, CircularProgress, SectionHeading } from "@/components/dashboard/DashboardUI";
import { useAnalysisResults, buildLanguageStack } from "@/hooks/use-dashboard";

// Tech skills that are commonly in-demand — cross-referenced with detected languages
const IN_DEMAND_SKILLS = [
  { skill: "TypeScript", demand: 95 }, { skill: "React", demand: 90 },
  { skill: "Node.js", demand: 85 }, { skill: "Python", demand: 80 },
  { skill: "PostgreSQL", demand: 75 }, { skill: "Docker", demand: 72 },
  { skill: "AWS", demand: 70 }, { skill: "GraphQL", demand: 65 },
  { skill: "Redis", demand: 60 }, { skill: "Kubernetes", demand: 58 },
  { skill: "Go", demand: 55 }, { skill: "Terraform", demand: 50 },
  { skill: "OpenTelemetry", demand: 45 }, { skill: "Next.js", demand: 88 },
  { skill: "tRPC", demand: 42 }, { skill: "Vitest", demand: 40 },
];

function JobsPage() {
  const { data, loading, error, refresh } = useAnalysisResults();

  if (loading) return <PageSkeleton />;
  if (error) return <PageError message={error} retry={refresh} />;

  const score = data?.score;
  const repos = data?.repositories ?? [];
  const jobs = data?.recentJobs ?? [];
  const latestJob = jobs[0] ?? null;

  // Derive detected languages from repos
  const langStack = buildLanguageStack(repos);
  const detectedLangs = new Set(langStack.map(l => l.name.toLowerCase()));

  // Job match score based on composite — if no score, show placeholder
  const composite = score?.composite ?? 0;

  // Build job matches derived from score level
  const level = score?.level ?? "JUNIOR";
  const jobMatches = getJobMatchesForLevel(level, composite);

  // Stack match percentage — ratio of detected languages that are in-demand
  const stackMatch = Math.round(
    (IN_DEMAND_SKILLS.filter(s => detectedLangs.has(s.skill.toLowerCase())).length
      / Math.min(IN_DEMAND_SKILLS.length, 8)) * 100
  );

  // Skills heat map — mark detected ones as "you have"
  const skillsWithOwnership = IN_DEMAND_SKILLS.map(s => ({
    ...s,
    owned: detectedLangs.has(s.skill.toLowerCase()),
  }));

  return (
    <div className="space-y-14">
      {latestJob && <AnalysisBanner job={latestJob} />}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
            /dashboard / jobs
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Where you stand.</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            // based on your {level.toLowerCase()} level code profile
          </p>
        </div>
      </header>

      {!score ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="font-mono text-4xl text-muted-foreground/20">∅</div>
          <p className="font-mono text-sm text-muted-foreground">Run an analysis first to see job matches.</p>
        </div>
      ) : (
        <>
          {/* Roles list */}
          <section>
            <SectionHeading kicker="01" title="Roles you qualify for" />
            <div className="mt-6 space-y-2">
              {jobMatches.map(j => {
                const color = j.match > 70 ? "#10b981" : j.match > 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div
                    key={j.title}
                    className="grid grid-cols-1 items-center gap-4 border-l-[2px] border-[#1a1a1a] bg-[#0a0a0a] p-5 transition hover:border-violet hover:bg-[#0f0f0f] md:grid-cols-[2fr_1fr_1.5fr_auto]"
                  >
                    <div>
                      <div className="font-semibold">{j.title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{j.type}</div>
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      ${j.minSalary}k – ${j.maxSalary}k
                    </div>
                    <div>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em]">
                        <span className="text-muted-foreground">match</span>
                        <span className="tabular-nums" style={{ color }}><CountUp to={j.match} />%</span>
                      </div>
                      <div className="mt-1 h-[3px] overflow-hidden bg-[#1a1a1a]">
                        <motion.div
                          className="h-full"
                          style={{ background: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${j.match}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-glow">
                      {j.match > 70 ? "strong fit" : j.match > 50 ? "potential" : "gap"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Salary spectrum */}
          <section className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6 md:p-8">
            <SectionHeading kicker="02" title="Salary spectrum" small />
            <div className="mt-8">
              <SalaryBar level={level} composite={composite} />
            </div>
          </section>

          {/* Skills + Stack match */}
          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <SectionHeading kicker="03" title="Skills in market demand" small />
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                // hotter = more frequently hired for · ✓ means detected in your repos
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {skillsWithOwnership.map(s => {
                  const heat = s.demand / 100;
                  return (
                    <span
                      key={s.skill}
                      className="border px-3 py-1.5 font-mono uppercase tracking-[0.05em] transition"
                      style={{
                        fontSize: `${0.78 + heat * 0.5}rem`,
                        background: s.owned
                          ? `color-mix(in oklab, #10b981 ${heat * 40}%, transparent)`
                          : `color-mix(in oklab, #7c3aed ${heat * 50}%, transparent)`,
                        borderColor: s.owned
                          ? `color-mix(in oklab, #10b981 ${heat * 80}%, #1a1a1a)`
                          : `color-mix(in oklab, #7c3aed ${heat * 80}%, #1a1a1a)`,
                        color: heat > 0.7 ? "white" : "var(--foreground)",
                        borderRadius: 4,
                      }}
                    >
                      {s.owned ? "✓ " : ""}{s.skill}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <SectionHeading kicker="04" title="Stack match" small />
              <div className="mt-6">
                <CircularProgress value={stackMatch} size={180} color="#a78bfa" />
              </div>
              <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
                // of top 8 in-demand skills detected in your repos
              </p>
              <div className="mt-5 w-full space-y-1.5 font-mono text-[11px]">
                {langStack.slice(0, 5).map(l => (
                  <div key={l.name} className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span className="text-muted-foreground">{l.name}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground/60">{l.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ─── Derived job matches based on score ───────────────────────────────────────

function getJobMatchesForLevel(level: string, composite: number) {
  const base: Record<string, { title: string; type: string; minSalary: number; maxSalary: number; matchBase: number }[]> = {
    JUNIOR: [
      { title: "Junior Frontend Developer", type: "Full-time", minSalary: 45, maxSalary: 70, matchBase: 82 },
      { title: "Junior Backend Engineer", type: "Full-time", minSalary: 50, maxSalary: 75, matchBase: 75 },
      { title: "Software Engineering Intern", type: "Contract", minSalary: 30, maxSalary: 50, matchBase: 90 },
    ],
    MID: [
      { title: "Mid-Level Full Stack Developer", type: "Full-time", minSalary: 70, maxSalary: 100, matchBase: 80 },
      { title: "Product Engineer", type: "Full-time", minSalary: 80, maxSalary: 110, matchBase: 72 },
      { title: "Backend Engineer", type: "Remote", minSalary: 75, maxSalary: 105, matchBase: 76 },
      { title: "Founding Engineer (Startup)", type: "Full-time", minSalary: 90, maxSalary: 120, matchBase: 60 },
    ],
    SENIOR: [
      { title: "Senior Software Engineer", type: "Full-time", minSalary: 120, maxSalary: 160, matchBase: 85 },
      { title: "Lead Backend Engineer", type: "Full-time", minSalary: 130, maxSalary: 170, matchBase: 74 },
      { title: "Principal Engineer", type: "Full-time", minSalary: 150, maxSalary: 200, matchBase: 55 },
      { title: "Staff Engineer", type: "Remote", minSalary: 160, maxSalary: 210, matchBase: 45 },
    ],
    STAFF: [
      { title: "Staff Software Engineer", type: "Full-time", minSalary: 180, maxSalary: 240, matchBase: 88 },
      { title: "Principal Engineer", type: "Full-time", minSalary: 200, maxSalary: 280, matchBase: 72 },
      { title: "VP of Engineering", type: "Full-time", minSalary: 220, maxSalary: 300, matchBase: 55 },
    ],
  };

  const roles = base[level] ?? base.JUNIOR;
  return roles.map(r => ({
    ...r,
    match: Math.round(Math.min(98, r.matchBase + (composite - 50) * 0.3)),
  }));
}

function SalaryBar({ level, composite }: { level: string; composite: number }) {
  const brackets: Record<string, { min: number; max: number; next: number; nextMax: number }> = {
    JUNIOR: { min: 45, max: 70, next: 70, nextMax: 95 },
    MID: { min: 70, max: 100, next: 100, nextMax: 140 },
    SENIOR: { min: 120, max: 160, next: 160, nextMax: 210 },
    STAFF: { min: 180, max: 240, next: 240, nextMax: 320 },
  };
  const b = brackets[level] ?? brackets.JUNIOR;
  return (
    <>
      <div className="relative h-4 overflow-hidden rounded-full bg-[#111]">
        <div className="absolute inset-y-0 left-[15%] flex w-[22%] items-center justify-center rounded-full bg-violet">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white">you</span>
        </div>
        <div className="absolute inset-y-0 left-[42%] w-[20%] rounded-full border border-dashed border-warning" />
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>$40k</span><span>$80k</span><span>$120k</span><span>$160k</span><span>$200k+</span>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">you're here</div>
          <div className="mt-2 text-3xl font-black tabular-nums">
            $<CountUp to={b.min} />k – $<CountUp to={b.max} />k
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-warning/80">
            {nextLevelLabel(level)} range
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-warning">
            $<CountUp to={b.next} />k – $<CountUp to={b.nextMax} />k
          </div>
        </div>
      </div>
    </>
  );
}

function nextLevelLabel(level: string): string {
  const map: Record<string, string> = { JUNIOR: "Mid-Level", MID: "Senior", SENIOR: "Staff", STAFF: "Principal" };
  return map[level] ?? "Principal";
}

export const Route = createFileRoute("/dashboard/jobs")({
  head: () => ({
    meta: [
      { title: "Job Market — CodeAudit" },
      { name: "description", content: "Roles you qualify for, salary spectrum, in-demand skills, stack match." },
    ],
  }),
  component: JobsPage,
});
