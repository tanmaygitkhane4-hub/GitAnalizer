import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import ClickSpark from "@/components/animations/ClickSpark";
import {
  validateGitHubUsername,
  linkGitHubUsername,
  register,
  login,
  syncGitHub,
  startAnalysis,
  isAuthenticated,
  type GitHubProfile,
} from "@/lib/api";
import { toast } from "sonner";

type Level = "Junior" | "Mid-level" | "Senior" | "Staff";

const levels: { id: Level; tag: string }[] = [
  { id: "Junior", tag: "0–2y" },
  { id: "Mid-level", tag: "3–5y" },
  { id: "Senior", tag: "5–8y" },
  { id: "Staff", tag: "8y+" },
];

const GitHubIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.55 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.63 1.58.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.67.8.55A11.52 11.52 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5z" />
  </svg>
);

type GitHubValidState = "idle" | "checking" | "valid" | "invalid";

export default function Input() {
  const navigate = useNavigate();

  // === Step 0: GitHub username ===
  const [github, setGithub] = useState("");
  const [ghState, setGhState] = useState<GitHubValidState>("idle");
  const [ghProfile, setGhProfile] = useState<GitHubProfile | null>(null);

  // === Step 1: Level + location ===
  const [level, setLevel] = useState<Level | null>(null);
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);

  // === Step 2: Account (register / login) ===
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // === Navigation ===
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);

  // ── Validate GitHub username (debounce-style: on blur or enter) ────────────
  const validateUsername = async (raw: string) => {
    const username = raw.replace("https://github.com/", "").replace("github.com/", "").trim().replace(/\/$/, "");
    if (!username || username.length < 2) {
      setGhState("idle");
      setGhProfile(null);
      return;
    }
    setGhState("checking");
    try {
      const profile = await validateGitHubUsername(username);
      setGhProfile(profile);
      setGhState("valid");
      // Auto-normalise the input to just the username
      setGithub(username);
    } catch {
      setGhState("invalid");
      setGhProfile(null);
    }
  };

  const handleGithubBlur = () => {
    if (github.trim()) validateUsername(github.trim());
  };

  const handleGithubEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") validateUsername(github.trim());
  };

  // ── Step guards ────────────────────────────────────────────────────────────
  const canNext0 = ghState === "valid";
  const canNext1 = !!level && (remote || location.length > 1);
  const canNext2 = email.length > 4 && password.length >= 8;

  // ── Final launch ───────────────────────────────────────────────────────────
  const launch = async () => {
    setLaunching(true);
    try {
      // 1. Auth — register or login
      if (!isAuthenticated()) {
        try {
          if (authMode === "register") {
            await register(email, password, name || ghProfile?.name || undefined);
          } else {
            await login(email, password);
          }
        } catch (err: any) {
          // If register fails because email exists, try login
          if (authMode === "register" && err.message?.includes("already registered")) {
            toast("Account exists — logging in instead…");
            await login(email, password);
          } else {
            throw err;
          }
        }
      }

      // 2. Link GitHub username (server verifies via PAT)
      const username = github.trim();
      await linkGitHubUsername(username);

      // 3. Start GitHub sync + analysis (server PAT does the fetching)
      await syncGitHub();
      await startAnalysis();

      // 4. Navigate to the auditing loading screen
      navigate({ to: "/auditing" });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
      setLaunching(false);
    }
  };

  return (
    <div className="relative min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Progress bar header */}
        <div className="mb-12 flex items-center gap-4">
          <button
            onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep((s) => s - 1))}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition hover:text-violet-glow"
          >
            ← back
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            step {String(step + 1).padStart(2, "0")} / 03
          </span>
          <div className="ml-auto h-px flex-1 max-w-[200px] overflow-hidden bg-[#1a1a1a]">
            <motion.div
              className="h-full bg-violet"
              initial={false}
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Step 0: GitHub username ─────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
                01 / source
              </div>
              <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
                Show us your work.
              </h1>
              <p className="mt-4 max-w-xl font-mono text-sm text-muted-foreground">
                // enter your github username — we'll pull your repos via the API
              </p>

              <div className="mt-12">
                <label className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  github username
                </label>
                <div className="term-input-wrap flex items-center gap-3 pb-1">
                  <GitHubIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <input
                    value={github}
                    onChange={(e) => {
                      setGithub(e.target.value);
                      setGhState("idle");
                      setGhProfile(null);
                    }}
                    onBlur={handleGithubBlur}
                    onKeyDown={handleGithubEnter}
                    placeholder="your-handle  (or paste full github.com/URL)"
                    className="term-input h-16 w-full text-xl font-medium text-foreground placeholder:text-muted-foreground/40"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {github && (
                    <span className="shrink-0 font-mono text-sm">
                      {ghState === "checking" && (
                        <span className="text-muted-foreground animate-pulse">[ ... ]</span>
                      )}
                      {ghState === "valid" && <span className="text-success">[ ok ]</span>}
                      {ghState === "invalid" && <span className="text-danger">[ × ]</span>}
                    </span>
                  )}
                </div>

                {/* Profile preview card */}
                {ghProfile && ghState === "valid" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex items-center gap-4 border border-violet/30 bg-[#12091f] px-5 py-4 rounded-md"
                  >
                    <img
                      src={ghProfile.avatar}
                      alt={ghProfile.login}
                      className="h-12 w-12 rounded-full border border-violet/20"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {ghProfile.name || ghProfile.login}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        @{ghProfile.login} · {ghProfile.publicRepos} repos · {ghProfile.followers} followers
                      </div>
                      {ghProfile.bio && (
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground/70 truncate">
                          {ghProfile.bio}
                        </div>
                      )}
                    </div>
                    <span className="ml-auto shrink-0 text-success font-mono text-xs">verified ✓</span>
                  </motion.div>
                )}

                {ghState === "invalid" && (
                  <p className="mt-3 font-mono text-xs text-danger">
                    GitHub user not found. Check the username and try again.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Step 1: Level + location ────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
                02 / benchmark
              </div>
              <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
                Set your benchmark.
              </h1>
              <p className="mt-4 max-w-xl font-mono text-sm text-muted-foreground">
                // we'll compare your code against what's expected at this level.
              </p>

              <div className="mt-12 flex flex-wrap gap-3">
                {levels.map((l) => {
                  const active = level === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={`relative flex h-44 w-20 shrink-0 flex-col items-center justify-between overflow-hidden border p-3 transition-all duration-300 md:h-48 md:w-24 ${
                        active
                          ? "border-violet bg-[#12091f]"
                          : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]"
                      }`}
                      style={{ borderRadius: 4 }}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {l.tag}
                      </span>
                      <motion.span
                        animate={
                          active
                            ? { rotate: 0, scale: 1, color: "#ffffff" }
                            : { rotate: -90, scale: 0.85, color: "#444" }
                        }
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        className="text-xl font-black tracking-tight whitespace-nowrap"
                      >
                        {l.id}
                      </motion.span>
                      <span className={`h-1 w-1 rounded-full transition ${active ? "bg-violet" : "bg-[#222]"}`} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-12 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <label className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    location
                  </label>
                  <div className="term-input-wrap pb-1">
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={remote}
                      placeholder="e.g. berlin, germany"
                      className="term-input h-12 w-full text-base text-foreground placeholder:text-muted-foreground/40 disabled:opacity-30"
                    />
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={remote}
                    onChange={(e) => setRemote(e.target.checked)}
                    className="accent-[var(--violet)]"
                  />
                  remote anywhere
                </label>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Account creation ────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
                03 / account
              </div>
              <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
                Save your audit.
              </h1>
              <p className="mt-4 max-w-xl font-mono text-sm text-muted-foreground">
                // create an account to store results — no GitHub OAuth needed.
              </p>

              {/* Auth mode toggle */}
              <div className="mt-10 flex gap-2">
                {(["register", "login"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setAuthMode(m)}
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border transition ${
                      authMode === m
                        ? "border-violet text-violet-glow bg-violet/10"
                        : "border-[#1a1a1a] text-muted-foreground hover:border-[#2a2a2a]"
                    }`}
                    style={{ borderRadius: 4 }}
                  >
                    {m === "register" ? "new account" : "sign in"}
                  </button>
                ))}
              </div>

              <div className="mt-8 space-y-6">
                {authMode === "register" && (
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      display name <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <div className="term-input-wrap pb-1">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={ghProfile?.name || "Your name"}
                        className="term-input h-12 w-full text-base text-foreground placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    email
                  </label>
                  <div className="term-input-wrap pb-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="term-input h-12 w-full text-base text-foreground placeholder:text-muted-foreground/40"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    password <span className="text-muted-foreground/50">(min 8 chars)</span>
                  </label>
                  <div className="term-input-wrap pb-1">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="term-input h-12 w-full text-base text-foreground placeholder:text-muted-foreground/40"
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    />
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="mt-1 font-mono text-[10px] text-danger">at least 8 characters</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-8 border border-[#1a1a1a] bg-[#0a0a0a] p-5 font-mono text-sm" style={{ borderRadius: 4 }}>
                <TermLine label="github" value={`@${github}`} />
                <TermLine label="level" value={`${level ?? "—"} (claimed)`} />
                <TermLine label="location" value={remote ? "remote anywhere" : location || "—"} />
                <TermLine label="action" value={authMode === "register" ? "create account + audit" : "sign in + audit"} />
              </div>

              <div className="mt-10">
                <ClickSpark sparkCount={14} sparkRadius={32}>
                  <button
                    onClick={launch}
                    disabled={launching || !canNext2}
                    className="btn-initiate group relative flex h-[72px] w-full items-center justify-center overflow-hidden rounded-md text-base font-bold uppercase text-white shadow-violet transition disabled:opacity-50"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    {launching ? (
                      <span className="flex items-center gap-3">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        launching audit...
                      </span>
                    ) : (
                      <span>initiate audit →</span>
                    )}
                  </button>
                </ClickSpark>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 2 && (
          <div className="mt-14 flex justify-end">
            <ClickSpark>
              <button
                disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1)}
                onClick={() => setStep((s) => Math.min(2, s + 1))}
                className="font-mono text-xs uppercase tracking-[0.2em] text-violet-glow transition hover:text-white disabled:cursor-not-allowed disabled:text-muted-foreground/30"
              >
                next →
              </button>
            </ClickSpark>
          </div>
        )}
      </div>
    </div>
  );
}

function TermLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-violet-glow/60">{">"}</span>
      <span className="w-24 text-muted-foreground">{label}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
