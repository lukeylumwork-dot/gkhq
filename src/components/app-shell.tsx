import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserCog, MessageSquare, FileText, Database, FolderOpen, BellRing, Calendar, BarChart3, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/goalkeepers", label: "Goalkeepers", icon: Users },
  { to: "/mentors", label: "Mentors", icon: UserCog },
  { to: "/interactions", label: "Interactions", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/intelligence", label: "Intelligence", icon: Database },
  { to: "/media", label: "Media Library", icon: FolderOpen },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/executive", label: "Executive", icon: BarChart3 },
] as const;

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
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
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
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
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60">
            <div className="size-7 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-semibold">DM</div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium">D. Mitchell</span>
              <span className="text-[10px] text-muted-foreground">Head of GK Ops</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="md:hidden font-semibold">RPM</div>
          <div className="flex-1 max-w-xl relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search goalkeepers, mentors, reports…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-input/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="size-4" /> New Interaction
          </button>
          <button className="size-9 grid place-items-center rounded-md border border-border hover:bg-accent">
            <BellRing className="size-4" />
          </button>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
