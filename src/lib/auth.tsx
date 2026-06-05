import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "mentor" | "scout" | "director";

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
  { id: "u-scott", name: "Scott Barron", email: "scott@rpmgk.com", role: "director", initials: "SB", title: "Co-Founder & Director", mentorId: "m-scott" },
  { id: "u-richard", name: "Richard Lee", email: "richard@rpmgk.com", role: "admin", initials: "RL", title: "Co-Founder & Director", mentorId: "m-richard" },
  { id: "u-sam", name: "Sam Winstanley", email: "sam@rpmgk.com", role: "director", initials: "SW", title: "Co-Founder & Director", mentorId: "m-sam" },
  { id: "u-david-r", name: "David Rouse", email: "david.rouse@rpmgk.com", role: "admin", initials: "DR", title: "Managing Director" },
  { id: "u-matt-g", name: "Matt GKU", email: "matt.gku@rpmgk.com", role: "scout", initials: "MG", title: "Goalkeeper Intelligence Scout" },
];

// Permission catalogue
export type Permission =
  | "users.manage"
  | "goalkeepers.view"
  | "goalkeepers.edit"
  | "goalkeepers.create"
  | "mentors.assign"
  | "interactions.view"
  | "interactions.log"
  | "reports.view"
  | "reports.submit"
  | "reports.manage"
  | "media.view"
  | "media.upload"
  | "media.edit"
  | "intelligence.view"
  | "alerts.view"
  | "calendar.view"
  | "executive.view"
  | "audit.view"
  | "mentors.view";

const MATRIX: Record<Role, Permission[]> = {
  admin: [
    "users.manage", "goalkeepers.view", "goalkeepers.edit", "goalkeepers.create",
    "mentors.assign", "mentors.view", "interactions.view", "interactions.log",
    "reports.view", "reports.submit", "reports.manage", "media.view", "media.upload",
    "media.edit", "intelligence.view", "alerts.view", "calendar.view", "executive.view",
    "audit.view",
  ],
  mentor: [
    "goalkeepers.view", "interactions.view", "interactions.log",
    "reports.view", "reports.submit", "media.view", "media.upload", "media.edit",
    "alerts.view", "calendar.view", "intelligence.view",
  ],
  scout: [
    "goalkeepers.view", "goalkeepers.create", "reports.view", "reports.submit",
    "media.view", "media.upload", "media.edit", "intelligence.view", "calendar.view",
  ],
  director: [
    "goalkeepers.view", "mentors.view", "reports.view", "intelligence.view",
    "executive.view", "alerts.view", "calendar.view", "interactions.view",
    "audit.view",
  ],
};

interface AuthState {
  user: SessionUser | null;
  signIn: (id: string) => void;
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
  const signOut = () => {
    setUser(null);
    try { window.localStorage.removeItem(KEY); } catch {}
  };
  const can = (p: Permission) => !!user && MATRIX[user.role].includes(p);

  // Avoid SSR/client flash mismatch
  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return <Ctx.Provider value={{ user, signIn, signOut, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  mentor: "Mentor",
  scout: "Scout",
  director: "Director",
};
