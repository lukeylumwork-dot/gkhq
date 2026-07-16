import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserCog, MessageSquare, FileText, Database, FolderOpen, BellRing, Calendar, BarChart3, Search, Plus, LogOut, ChevronDown, ShieldCheck, History, Check, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, ROLE_LABEL, type Permission, type Role } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { WorkflowDialog, type WorkflowKind } from "@/components/workflows";
import { useNotifications } from "@/lib/notifications";
import { formatRelative } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; perm: Permission };
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: "goalkeepers.view" },
  { to: "/goalkeepers", label: "Goalkeepers", icon: Users, perm: "goalkeepers.view" },
  { to: "/mentors", label: "Mentors", icon: UserCog, perm: "mentors.view" },
  { to: "/interactions", label: "Interactions Log", icon: MessageSquare, perm: "interactions.view" },
  { to: "/reports", label: "Match Reports", icon: FileText, perm: "reports.view" },
  { to: "/intelligence", label: "Intelligence", icon: Database, perm: "intelligence.view" },
  { to: "/media", label: "Media Library", icon: FolderOpen, perm: "media.view" },
  { to: "/audit", label: "Audit Log", icon: History, perm: "audit.view" },
  { to: "/alerts", label: "Notification Centre", icon: BellRing, perm: "alerts.view" },
  { to: "/calendar", label: "Calendar", icon: Calendar, perm: "calendar.view" },
  { to: "/executive", label: "Executive", icon: BarChart3, perm: "executive.view" },
  { to: "/system/users", label: "Users & Roles", icon: ShieldCheck, perm: "system.manage" },
  { to: "/system/permissions", label: "Permission Check", icon: ShieldCheck, perm: "goalkeepers.view" },

];

export function AppShell() {
  const { user, can, signOut, setViewAsRole } = useAuth();
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
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border">
          <img src="/app-icon-120.png" alt="GKHQ" width={28} height={28} className="size-7 rounded-[6px] shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold tracking-tight truncate">{user.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{ROLE_LABEL[user.role]}</span>
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
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] text-[12.5px] font-semibold uppercase tracking-[0.05em] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
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
        <header className="h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-sidebar/95 backdrop-blur sticky top-0 z-10">
          <div className="md:hidden font-display uppercase tracking-[0.04em] font-bold">GKHQ</div>
          <div className="flex-1 max-w-xl relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search goalkeepers, mentors, reports…" className="w-full h-9 pl-9 pr-14 rounded-md bg-input border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
            <kbd className="hidden md:inline-flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded border border-border bg-background/60 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
          </div>
          {user.actualRole === "super_admin" ? (
            <div className="hidden md:inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-medium uppercase tracking-wider" title="Interface only — server permissions are unchanged. This preview does not grant or restrict backend access.">
              <ShieldCheck className="size-3" />
              {user.role !== user.actualRole ? (
                <span className="hidden lg:inline">
                  Viewing as {ROLE_LABEL[user.role]}
                  <span className="mx-1.5 text-primary/60">·</span>
                  <span className="text-primary/80 normal-case tracking-normal">interface only</span>
                </span>
              ) : (
                <span>View as <span className="text-primary/70 normal-case tracking-normal">(interface only)</span></span>
              )}
              <select
                value={user.role}
                onChange={(e) => setViewAsRole(e.target.value as Role)}
                className="h-6 bg-transparent text-primary text-[10px] font-medium uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="mentor_manager">Mentor Manager</option>
                <option value="mentor">Mentor</option>
              </select>
              {user.role !== user.actualRole && (
                <button
                  onClick={() => setViewAsRole(null)}
                  title="Exit view as and return to Super Admin"
                  className="ml-1 inline-flex items-center gap-1 h-5 pl-1.5 pr-2 rounded bg-primary text-primary-foreground hover:opacity-90"
                >
                  <X className="size-3" />
                  <span>Exit view as</span>
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-medium uppercase tracking-wider"><ShieldCheck className="size-3" />{ROLE_LABEL[user.role]}</div>
          )}
          {primaryAction && (
            <button onClick={() => setWorkflow(primaryAction.kind)} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs uppercase tracking-[0.06em] font-semibold hover:opacity-90">
              <Plus className="size-4" />{primaryAction.label}
            </button>
          )}
          <button
            onClick={() => { signOut(); navigate({ to: "/login" as never }); }}
            title="Sign out"
            aria-label="Sign out"
            className="inline-flex items-center gap-1.5 h-9 px-2.5 md:px-3 rounded-md border border-border text-xs uppercase tracking-[0.06em] font-semibold hover:bg-accent"
          >
            <LogOut className="size-4" />
            <span className="hidden md:inline">Sign out</span>
          </button>
          <div ref={bellRef} className="relative">
            <button onClick={() => setBellOpen((v) => !v)} className="relative size-9 grid place-items-center rounded-md border border-border hover:bg-accent">
              <BellRing className="size-4" />
              {notif.unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-mono font-semibold grid place-items-center">
                  {notif.unread > 9 ? "9+" : notif.unread}
                </span>
              )}
            </button>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setBellOpen(false)} />
                <div className="absolute right-0 mt-2 w-[360px] rounded-md border border-border bg-popover shadow-xl z-30 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duty Notifications</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => notif.markAllRead()} title="Mark all read" className="p-1 rounded hover:bg-accent text-muted-foreground"><Check className="size-3.5" /></button>
                      <button onClick={() => notif.clearAll()} title="Clear" className="p-1 rounded hover:bg-accent text-muted-foreground"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {notif.items.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-muted-foreground">No duty status changes.</div>
                    ) : (
                      notif.items.slice(0, 30).map((n) => {
                        const tone = n.to === "red" ? "bg-destructive" : n.to === "amber" ? "bg-warning" : "bg-success";
                        return (
                          <Link
                            key={n.id}
                            to="/goalkeepers/$gkId"
                            params={{ gkId: n.gkId }}
                            onClick={() => { notif.markRead(n.id); setBellOpen(false); }}
                            className={cn("flex gap-2.5 px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-accent/40", !n.read && "bg-accent/20")}
                          >
                            <span className={cn("mt-1.5 size-2 rounded-full shrink-0", tone)} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{n.gkName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Duty moved <span className="uppercase">{n.from}</span> → <span className="uppercase font-medium text-foreground/80">{n.to}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(n.date)}</div>
                            </div>
                            {!n.read && <span className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />}
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <Link to="/alerts" onClick={() => setBellOpen(false)} className="block px-3 py-2 border-t border-border text-center text-xs text-primary hover:bg-accent/40">
                    Open alerts & email settings →
                  </Link>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation — primary routes for the current role */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur grid grid-cols-5 h-16 pb-safe">
        {visible.slice(0, 5).map((n) => {
          const active = n.exact ? path === n.to : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to as never}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate max-w-[64px]">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <WorkflowDialog kind={workflow} onClose={() => setWorkflow(null)} />
    </div>
  );
}
