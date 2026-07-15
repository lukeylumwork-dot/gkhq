import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ShieldOff, Users, Search, Loader2, AlertCircle } from "lucide-react";
import { useAuth, ROLE_LABEL, type Role } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listManagedUsers,
  setManagedUserRole,
  type ManagedUserRow,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/system/users")({ component: SystemUsersPage });

const ROLES: Role[] = ["super_admin", "admin", "mentor_manager", "mentor"];
type RoleOrNone = Role | "";

const ROLE_TONE: Record<Role, string> = {
  super_admin: "bg-primary/15 text-primary border-primary/30",
  admin: "bg-accent text-accent-foreground border-border",
  mentor_manager: "bg-warning/15 text-warning border-warning/30",
  mentor: "bg-success/15 text-success border-success/30",
};

const QUERY_KEY = ["managed-users"] as const;

function SystemUsersPage() {
  const { user, can } = useAuth();
  const [q, setQ] = useState("");
  const list = useServerFn(listManagedUsers);
  const setRole = useServerFn(setManagedUserRole);
  const qc = useQueryClient();

  const canManage = !!user && can("system.manage");

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => list(),
    enabled: canManage,
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; role: Role | null; name: string }) =>
      setRole({ data: { userId: vars.userId, role: vars.role } }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        vars.role
          ? `${vars.name} → ${ROLE_LABEL[vars.role]}`
          : `${vars.name}: role revoked`,
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update role";
      toast.error(msg);
    },
  });

  if (!canManage) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-lg border border-border bg-card p-6 text-center">
        <ShieldOff className="size-8 mx-auto text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only Super Admins can manage users and roles.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const users = query.data ?? [];
  const filtered = users.filter((u) =>
    !q.trim() ||
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase()),
  );

  const changeRole = (u: ManagedUserRow, next: RoleOrNone) => {
    const nextRole = next === "" ? null : next;
    if (nextRole === u.role) return;
    mutation.mutate({ userId: u.id, role: nextRole, name: u.name || u.email });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-primary">
              System · Super Admin
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Users &amp; Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign or revoke platform roles. Changes are written to the database and take effect on the user's next sign-in.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-full h-9 pl-9 pr-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="hidden md:grid grid-cols-[1fr_180px_220px] gap-3 px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30">
          <div>User</div>
          <div>Current role</div>
          <div>Assign role</div>
        </div>

        {query.isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading users…
          </div>
        ) : query.isError ? (
          <div className="px-4 py-10 text-center text-sm">
            <AlertCircle className="size-6 mx-auto mb-2 text-destructive" />
            <div className="text-destructive">
              {query.error instanceof Error ? query.error.message : "Failed to load users"}
            </div>
            <button
              onClick={() => query.refetch()}
              className="mt-3 inline-flex h-8 px-3 items-center rounded-md border border-border text-xs font-medium hover:bg-accent"
            >
              Retry
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => {
              const isSelf = u.id === user!.id;
              const busy = mutation.isPending && mutation.variables?.userId === u.id;
              return (
                <li
                  key={u.id}
                  className="grid md:grid-cols-[1fr_180px_220px] gap-3 px-4 py-3 items-center"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-accent grid place-items-center text-xs font-semibold shrink-0">
                      {u.initials || (u.name || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {u.name || u.email}
                        {isSelf && (
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                        {u.title ? ` · ${u.title}` : ""}
                      </div>
                    </div>
                  </div>
                  <div>
                    {u.role ? (
                      <span
                        className={cn(
                          "inline-flex h-6 px-2 items-center rounded border text-[10px] uppercase tracking-wider font-medium",
                          ROLE_TONE[u.role],
                        )}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                    ) : (
                      <span className="inline-flex h-6 px-2 items-center rounded border border-dashed border-border text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                        No role
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role ?? ""}
                      onChange={(e) => changeRole(u, e.target.value as RoleOrNone)}
                      disabled={isSelf || busy}
                      title={isSelf ? "You can't change your own role from this screen" : undefined}
                      className="flex-1 h-9 px-2 rounded-md border border-border bg-input/60 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">— No role —</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                <Users className="size-6 mx-auto mb-2 opacity-50" />
                {users.length === 0
                  ? "No users found. Team members appear here after they sign in for the first time."
                  : `No users match "${q}".`}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
