import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { handleOAuthCallback } from "@/lib/api";
import { motion } from "framer-motion";

function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = handleOAuthCallback();
    if (ok) {
      setTimeout(() => navigate({ to: "/input" }), 500);
    } else {
      setError("OAuth failed — no tokens received.");
    }
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {error ? (
          <>
            <div className="font-mono text-danger text-sm">{error}</div>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 font-mono text-xs text-violet-glow hover:text-white"
            >
              ← back to home
            </button>
          </>
        ) : (
          <>
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-violet/30 border-t-violet" />
            <div className="mt-4 font-mono text-xs text-muted-foreground">
              // authenticated — redirecting...
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: OAuthCallback,
});
