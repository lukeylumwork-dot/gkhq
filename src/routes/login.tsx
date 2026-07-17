import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  component: LoginPage,
});

type View = "signin" | "forgot" | "sent";

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [view, setView] = useState<View>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (user) navigate({ to: next, replace: true });
  }, [user, navigate, next]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (!res.ok) setError(res.error || "Invalid email or password.");
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo });
    setSentTo(resetEmail.trim());
    setResetEmail("");
    setView("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <img src="/app-icon-120.png" alt="GKHQ" width={40} height={40} className="size-10 rounded-[8px]" />
          <div className="flex flex-col leading-tight">
            <img src="/wordmark.png" alt="GKHQ" height={22} className="h-[22px] w-auto" />
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">GKHQ by RPM</div>
          </div>
        </div>

        {view === "signin" && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-display font-bold uppercase tracking-[0.02em] leading-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Sign in with your GKHQ account.</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-xs font-medium mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="email" type="email" autoComplete="email" required autoFocus value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@gkhq.app"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium">Password</label>
                  <button type="button" onClick={() => setView("forgot")} className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" required value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground mt-8 leading-relaxed">
              GKHQ accounts are provisioned by an administrator. If you need access, contact your RPM admin.
            </p>
          </>
        )}

        {view === "forgot" && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-display font-bold uppercase tracking-[0.02em] leading-tight">Reset your password</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Enter your email and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="reset-email" type="email" required autoFocus value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition" />
                </div>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Send reset link
              </button>

              <button type="button" onClick={() => setView("signin")} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-3.5" />Back to sign in
              </button>
            </form>
          </>
        )}

        {view === "sent" && (
          <>
            <div className="mb-8">
              <div className="size-12 rounded-xl bg-secondary grid place-items-center mb-5"><CheckCircle2 className="size-6 text-primary" /></div>
              <h1 className="text-4xl font-display font-bold uppercase tracking-[0.02em] leading-tight">Check your inbox</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">If an account exists for <span className="text-foreground font-medium">{sentTo}</span>, you'll receive a reset link shortly.</p>
            </div>

            <button type="button" onClick={() => setView("signin")}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent/30 text-sm font-medium">
              <ArrowLeft className="size-4" />Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
