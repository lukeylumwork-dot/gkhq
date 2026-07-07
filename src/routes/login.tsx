import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ROLE_LABEL, useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { ShieldCheck, HeartHandshake, ArrowRight, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

const ACCOUNTS = [
  {
    id: "u-richard",
    name: "Richard Lee",
    role: "admin" as const,
    tagline: "Full platform access",
    icon: ShieldCheck,
  },
  {
    id: "u-david-r",
    name: "David Rouse",
    role: "admin" as const,
    tagline: "Full platform access",
    icon: ShieldCheck,
  },
  {
    id: "u-mentor",
    name: "Mentor User",
    role: "mentor" as const,
    tagline: "Goalkeeper development, interactions and mentoring workflows",
    icon: HeartHandshake,
  },
];

type View = "signin" | "forgot" | "sent";

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setSentTo(email.trim());
    setEmail("");
    setView("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm">R</div>
          <span className="font-semibold tracking-tight text-lg">RPM Hub</span>
        </div>

        {view === "signin" && (
          <>
            {/* Headline */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight leading-tight">
                Log-in
              </h1>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                A central database designed to streamline workflows, improve visibility, identify operational gaps, increase productivity and create a standardised approach across the RPM network.
              </p>
            </div>

            {/* Account cards */}
            <div className="space-y-2.5 mb-6">
              {ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.id}
                    onClick={() => signIn(acc.id)}
                    className="group w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-primary/20 transition-all text-left"
                  >
                    <div className="size-10 rounded-lg bg-secondary grid place-items-center shrink-0">
                      <Icon className="size-[18px] text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{acc.name}</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                          {ROLE_LABEL[acc.role]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{acc.tagline}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {view === "forgot" && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight leading-tight">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                Enter the email address associated with your RPM Hub account and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@rpmgk.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Send reset link
              </button>

              <button
                type="button"
                onClick={() => setView("signin")}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>
            </form>
          </>
        )}

        {view === "sent" && (
          <>
            <div className="mb-8">
              <div className="size-12 rounded-xl bg-secondary grid place-items-center mb-5">
                <CheckCircle2 className="size-6 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight leading-tight">
                Check your inbox
              </h1>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                If an account exists for <span className="text-foreground font-medium">{sentTo}</span>, you'll receive an email with instructions to reset your password shortly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setView("signin")}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent/30 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

