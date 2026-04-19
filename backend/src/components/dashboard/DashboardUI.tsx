import { motion } from 'framer-motion';

// ─── Loading skeleton ────────────────────────────────────────────────────────

export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 rounded bg-[#1a1a1a]" />
      <div className="h-32 w-full rounded bg-[#1a1a1a]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 rounded bg-[#1a1a1a]" />
        ))}
      </div>
      <div className="h-64 w-full rounded bg-[#1a1a1a]" />
    </div>
  );
}

// ─── Inline skeleton bars ────────────────────────────────────────────────────

export function SkeletonLine({ w = 'full', h = '4' }: { w?: string; h?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#1a1a1a] w-${w} h-${h}`}
    />
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

export function PageError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center"
    >
      <div className="font-mono text-5xl text-danger">!</div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-danger">
          // error
        </div>
        <p className="mt-2 max-w-md font-mono text-sm text-muted-foreground">{message}</p>
      </div>
      {retry && (
        <button
          onClick={retry}
          className="border border-violet px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-violet-glow transition hover:bg-violet hover:text-white"
        >
          retry
        </button>
      )}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon = '∅',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
    >
      <div className="font-mono text-4xl text-muted-foreground/30">{icon}</div>
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        {description && (
          <p className="mt-1 max-w-sm font-mono text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </motion.div>
  );
}

// ─── Analysis running banner ──────────────────────────────────────────────────

export function AnalysisBanner({ job }: { job: { status: string; message?: string | null } }) {
  const running = job.status === 'RUNNING';
  const failed = job.status === 'FAILED';

  if (!running && !failed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 flex items-center gap-3 border px-4 py-3 font-mono text-xs ${
        failed
          ? 'border-danger/40 bg-danger/5 text-danger'
          : 'border-violet/40 bg-violet/5 text-violet-glow'
      }`}
    >
      {running && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-glow" />
      )}
      {failed && <span className="text-danger">⚠</span>}
      <span>
        {job.message || (running ? 'Analysis running…' : 'Analysis failed')}
      </span>
    </motion.div>
  );
}

// ─── Score bar (reusable) ─────────────────────────────────────────────────────

export function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-20 overflow-hidden bg-[#1a1a1a]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full"
          style={{ background: color }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {Math.round(value)}
      </span>
    </div>
  );
}

// ─── Circular progress ─────────────────────────────────────────────────────────

export function CircularProgress({
  value,
  size = 180,
  color = '#a78bfa',
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a1a1a" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tabular-nums" style={{ color }}>
          {Math.round(value)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

export function SectionHeading({
  kicker,
  title,
  small = false,
}: {
  kicker: string;
  title: string;
  small?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-glow/70">
        / {kicker}
      </div>
      <h2
        className={`mt-2 font-black tracking-tight ${
          small ? 'text-2xl' : 'text-2xl md:text-3xl'
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
