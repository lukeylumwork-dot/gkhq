import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserCog, MessageSquare, FileText, Database, FolderOpen, BellRing, Calendar, BarChart3, Search, Plus, LogOut, ChevronDown, ShieldCheck, History, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, ROLE_LABEL, type Permission } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { WorkflowDialog, type WorkflowKind } from "@/components/workflows";
import { useNotifications } from "@/lib/notifications";
import { formatRelative } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; perm: Permission };
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: "goalkeepers.view" },
  { to: "/goalkeepers", label: "Goalkeepers", icon: Users, perm: "goalkeepers.view" },
  { to: "/mentors", label: "Mentors", icon: UserCog, perm: "mentors.view" },
  { to: "/interactions", label: "Interactions", icon: MessageSquare, perm: "interactions.view" },
  { to: "/reports", label: "Reports", icon: FileText, perm: "reports.view" },
  { to: "/intelligence", label: "Intelligence", icon: Database, perm: "intelligence.view" },
  { to: "/media", label: "Media Library", icon: FolderOpen, perm: "media.view" },
  { to: "/audit", label: "Audit Log", icon: History, perm: "audit.view" },
  { to: "/alerts", label: "Alerts", icon: BellRing, perm: "alerts.view" },
  { to: "/calendar", label: "Calendar", icon: Calendar, perm: "calendar.view" },
  { to: "/executive", label: "Executive", icon: BarChart3, perm: "executive.view" },
];

export function AppShell() {
  const { user, can, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowKind | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const notif = useNotifications();

  // Public routes that don't require auth
  const isPublic = path === "/login";

  useEffect(() => {
    if (!user && !isPublic) {
      navigate({ to: "/login" as never, search: { redirect: path } as never, replace: true });
    }
  }, [user, isPublic, navigate, path]);

  if (isPublic) return <Outlet />;
  if (!user) return <div className="min-h-screen bg-background" />;

  // Role-gated visible nav
  const visible = NAV.filter((n) => can(n.perm));

  // Pick a primary CTA per role
  const primaryAction: { kind: WorkflowKind; label: string } | null =
    can("interactions.log") ? { kind: "interaction", label: "Log Interaction" }
    : can("reports.submit") ? { kind: "report", label: "Submit Report" }
    : can("goalkeepers.create") ? { kind: "goalkeeper", label: "Add Goalkeeper" }
    : null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-sidebar-border">
          <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm">R</div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">RPM</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">GK Intelligence</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visible.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as never}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60">
            <div className="size-7 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-semibold">{user.initials}</div>
            <div className="flex-1 flex flex-col leading-tight text-left min-w-0">
              <span className="text-xs font-medium truncate">{user.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{ROLE_LABEL[user.role]} · {user.title}</span>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
              <button onClick={() => { signOut(); setMenuOpen(false); navigate({ to: "/login" as never }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"><LogOut className="size-3.5" />Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="md:hidden font-semibold">RPM</div>
          <div className="flex-1 max-w-xl relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search goalkeepers, mentors, reports…" className="w-full h-9 pl-9 pr-3 rounded-md bg-input/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-medium uppercase tracking-wider"><ShieldCheck className="size-3" />{ROLE_LABEL[user.role]}</div>
          {primaryAction && (
            <button onClick={() => setWorkflow(primaryAction.kind)} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="size-4" />{primaryAction.label}
            </button>
          )}
          <button className="size-9 grid place-items-center rounded-md border border-border hover:bg-accent">
            <BellRing className="size-4" />
          </button>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <WorkflowDialog kind={workflow} onClose={() => setWorkflow(null)} />
    </div>
  );
}
