import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DEMO_USERS, ROLE_LABEL, useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { ShieldCheck, Search, HeartHandshake, ArrowRight } from "lucide-react";

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
    id: "u-matt-g",
    name: "Matt GKU",
    role: "scout" as const,
    tagline: "Scouting workflows, reports and intelligence tools",
    icon: Search,
  },
  {
    id: "u-mentor",
    name: "Mentor User",
    role: "mentor" as const,
    tagline: "Goalkeeper development, interactions and mentoring workflows",
    icon: HeartHandshake,
  },
];

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm">R</div>
          <span className="font-semibold tracking-tight text-lg">RPM Hub</span>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Manage all goalkeeper operations, scouting intelligence, mentor activity, performance reporting and internal workflows from one central platform.
          </h1>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            A central database designed to streamline workflows, improve visibility, identify operational gaps, increase productivity and create a standardised approach across the RPM network.
          </p>
        </div>

        {/* Demo Access */}
        <div className="mb-6">
          <h2 className="text-sm font-medium tracking-tight text-foreground mb-1.5">Demo Access</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For prototype purposes, demo accounts do not require a username or password. Simply select a role below to explore the platform.
          </p>
        </div>

        {/* Account cards */}
        <div className="space-y-2.5 mb-8">
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

        {/* Prototype Notes */}
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-foreground mb-2">Prototype Notes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This prototype demonstrates role based access across the RPM platform. Different user types see different tools, workflows and data depending on their responsibilities within the organisation.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            If you would like to explore the full platform, sign in as Richard Lee or David Rouse.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 text-[11px] text-muted-foreground/60">
          RPM Football Operations
        </div>
      </div>
    </div>
  );
}
