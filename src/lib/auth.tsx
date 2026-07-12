import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "super_admin" | "admin" | "mentor_manager" | "mentor";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  title: string;
  mentorId?: string; // links to mock-data mentor
}

export const DEMO_USERS: SessionUser[] = [
  // Platform / leadership
  { id: "u-luke", name: "Luke Corrigan", email: "lcorrigan@gkhq.app", role: "super_admin", initials: "LC", title: "System Admin / Product Owner" },
  { id: "u-rich", name: "Rich Lee", email: "rlee@gkhq.app", role: "admin", initials: "RL", title: "Co-Founder & Director", mentorId: "m-rich-lee" },

  // Mentor team (collaborative — no per-goalkeeper assignment)
  { id: "u-drouse", name: "David Rouse", email: "drouse@gkhq.app", role: "mentor_manager", initials: "DR", title: "Managing Director & Mentor", mentorId: "m-david-rouse" },
  { id: "u-dwatson", name: "Dave Watson", email: "dwatson@gkhq.app", role: "mentor", initials: "DW", title: "Goalkeeper Mentor", mentorId: "m-dave-watson" },
  { id: "u-amarshall", name: "Andy Marshall", email: "amarshall@gkhq.app", role: "mentor", initials: "AM", title: "Goalkeeper Mentor", mentorId: "m-andy-marshall" },
  { id: "u-jstern", name: "Jack Stern", email: "jstern@gkhq.app", role: "mentor", initials: "JS", title: "Goalkeeper Mentor", mentorId: "m-jack-stern" },
  { id: "u-achamberlain", name: "Alec Chamberlain", email: "achamberlain@gkhq.app", role: "mentor", initials: "AC", title: "Goalkeeper Mentor", mentorId: "m-alec-chamberlain" },
  { id: "u-mmargetson", name: "Martyn Margetson", email: "mmargetson@gkhq.app", role: "mentor", initials: "MM", title: "Goalkeeper Mentor", mentorId: "m-martyn-margetson" },
  { id: "u-mmiddelbeek", name: "Martijn Middelbeek", email: "mmiddelbeek@gkhq.app", role: "mentor", initials: "MM", title: "Goalkeeper Mentor", mentorId: "m-martijn-middelbeek" },
  { id: "u-mbeadle", name: "Matt Beadle", email: "mbeadle@gkhq.app", role: "mentor", initials: "MB", title: "Goalkeeper Mentor", mentorId: "m-matt-beadle" },

  // Generic role-test accounts (for QA — sign in with any password)
  { id: "u-test-super", name: "Super Admin (Test)", email: "superadmin@gkhq.app", role: "super_admin", initials: "SA", title: "Test — Super Admin" },
  { id: "u-test-admin", name: "Admin (Test)", email: "admin@gkhq.app", role: "admin", initials: "AD", title: "Test — Admin" },
  { id: "u-test-mm", name: "Mentor Manager (Test)", email: "mentormanager@gkhq.app", role: "mentor_manager", initials: "MM", title: "Test — Mentor Manager" },
  { id: "u-test-mentor", name: "Mentor (Test)", email: "mentor@gkhq.app", role: "mentor", initials: "ME", title: "Test — Mentor", mentorId: "m-dave-watson" },
];

// Permission catalogue — kept intentionally coarse. Prefer role checks at route/nav
// level via `can()` so the map here is the single place to adjust access.
export type Permission =
  | "system.manage"        // user/role management, imports, destructive system actions, diagnostics
  | "goalkeepers.view"
  | "goalkeepers.edit"
  | "goalkeepers.create"
  | "mentors.view"
  | "interactions.view"
  | "interactions.log"
  | "reports.view"
  | "reports.submit"
  | "reports.manage"       // review / edit mentor-submitted reports
  | "media.view"
  | "media.upload"
  | "media.edit"
  | "intelligence.view"
  | "alerts.view"
  | "calendar.view"
  | "executive.view"
  | "audit.view";

const MENTOR: Permission[] = [
  "goalkeepers.view",
  "interactions.view", "interactions.log",
  "reports.view", "reports.submit",
  "media.view", "media.upload", "media.edit",
  "intelligence.view",
  "alerts.view", "calendar.view",
];

const MENTOR_MANAGER: Permission[] = [
  ...MENTOR,
  "goalkeepers.edit", "goalkeepers.create",
  "mentors.view",
  "reports.manage",
  "audit.view",
];

const ADMIN: Permission[] = [
  "goalkeepers.view", "goalkeepers.edit", "goalkeepers.create",
  "mentors.view", "mentors.assign",
  "interactions.view",
  "reports.view", "reports.manage",
  "media.view", "media.edit",
  "intelligence.view",
  "alerts.view", "calendar.view",
  "executive.view", "audit.view",
];

const SUPER_ADMIN: Permission[] = [
  "system.manage",
  ...ADMIN,
  "interactions.log", "reports.submit", "media.upload",
];

const MATRIX: Record<Role, Permission[]> = {
  super_admin: SUPER_ADMIN,
  admin: ADMIN,
  mentor_manager: MENTOR_MANAGER,
  mentor: MENTOR,
};

interface AuthState {
  user: SessionUser | null;
  signIn: (id: string) => void;
  signInByEmail: (email: string) => SessionUser | null;
  signOut: () => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AuthState | null>(null);
const KEY = "rpm.session.v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) {
        const u = DEMO_USERS.find((x) => x.id === raw);
        if (u) setUser(u);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const signIn = (id: string) => {
    const u = DEMO_USERS.find((x) => x.id === id);
    if (!u) return;
    setUser(u);
    try { window.localStorage.setItem(KEY, u.id); } catch {}
  };
  const signInByEmail = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const u = DEMO_USERS.find((x) => x.email.toLowerCase() === normalized);
    if (!u) return null;
    setUser(u);
    try { window.localStorage.setItem(KEY, u.id); } catch {}
    return u;
  };
  const signOut = () => {
    setUser(null);
    try { window.localStorage.removeItem(KEY); } catch {}
  };
  const can = (p: Permission) => !!user && MATRIX[user.role].includes(p);

  // Avoid SSR/client flash mismatch
  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return <Ctx.Provider value={{ user, signIn, signInByEmail, signOut, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  mentor_manager: "Mentor Manager",
  mentor: "Mentor",
};
