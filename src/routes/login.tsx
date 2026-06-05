import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { DEMO_USERS, ROLE_LABEL, useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Check, LogIn } from "lucide-react";
import { Avatar } from "@/components/primitives";

export const Route = createFileRoute("/login")({ component: LoginPage });

const HIGHLIGHTS = [
  "Goalkeeper Management",
  "Mentor & Scout Workflows",
  "Intelligence & Reporting",
];

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as { redirect?: string } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) navigate({ to: (search.redirect as never) ?? ("/" as never), replace: true });
  }, [user, navigate, search.redirect]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = DEMO_USERS.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return setErr("No account found for that email.");
    if (password.length < 4) return setErr("Enter a password (any 4+ characters for demo).");
    signIn(u.id);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr] bg-background">
      {/* Left panel — brand & context */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm">R</div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">RPM</div>
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/70">Refuel Performance Management</div>
          </div>
        </div>

        <div className="space-y-6 max-w-md">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">RPM Operations Platform</h1>
            <p className="text-sm text-sidebar-foreground/80 mt-3 leading-relaxed">
              Manage goalkeeper development, mentor activity, scouting intelligence and performance reporting across the RPM network.
            </p>
          </div>

          <ul className="space-y-2.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                <Check className="size-4 text-primary shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-[11px] text-sidebar-foreground/50">© RPM Football Operations</div>
      </div>

      {/* Right panel — sign in */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access the platform.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="name@rpmgk.com"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="••••••••"
              />
            </div>
            {err && <div className="text-xs text-destructive">{err}</div>}
            <button
              type="submit"
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <LogIn className="size-4" />
              Sign in
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-background text-[10px] uppercase tracking-wider text-muted-foreground">Continue as</span>
            </div>
          </div>

          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => signIn(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors text-left"
              >
                <Avatar initials={u.initials} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border font-medium uppercase tracking-wider">
                  {ROLE_LABEL[u.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
