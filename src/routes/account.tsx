import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KeyRound, Loader2, Check, X, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card } from "@/components/primitives";
import { changePassword } from "@/lib/account.functions";
import { toast } from "sonner";

type StrengthLevel = 0 | 1 | 2 | 3 | 4;
type Rule = { id: string; label: string; test: (pw: string) => boolean };

const RULES: Rule[] = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "Number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "Symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS: { label: string; className: string; bar: string }[] = [
  { label: "Very weak", className: "text-destructive", bar: "bg-destructive" },
  { label: "Weak", className: "text-destructive", bar: "bg-destructive" },
  { label: "Fair", className: "text-warning", bar: "bg-warning" },
  { label: "Good", className: "text-gk-green", bar: "bg-gk-green" },
  { label: "Strong", className: "text-gk-green", bar: "bg-gk-green" },
];

function scorePassword(pw: string, disqualifiers: string[] = []): StrengthLevel {
  if (!pw) return 0;
  const passed = RULES.filter((r) => r.test(pw)).length;
  let score = passed - 1; // 5 rules -> up to 4
  if (pw.length >= 12) score += 1;
  if (disqualifiers.some((d) => d && pw.toLowerCase() === d.toLowerCase())) score = 0;
  return Math.max(0, Math.min(4, score)) as StrengthLevel;
}


export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Account · GK.HQ" },
      { name: "description", content: "Manage your GK.HQ account and password." },
    ],
  }),
});

function AccountPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  const changePasswordFn = useServerFn(changePassword);

  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const tooShort = pw.length > 0 && pw.length < 8;
  const mismatch = confirm.length > 0 && pw !== confirm;
  const sameAsCurrent = pw.length > 0 && pw === current;
  const canSubmit =
    current.length > 0 && pw.length >= 8 && pw === confirm && !sameAsCurrent && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setOk(false);
    try {
      await changePasswordFn({ data: { currentPassword: current, newPassword: pw } });
      setOk(true);
      setCurrent("");
      setPw("");
      setConfirm("");
      toast.success("Password updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update password";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const initials = (user?.name ?? user?.email ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Account" description="Manage your sign-in credentials." />

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-muted/20">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold tracking-wider">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{user?.name ?? "—"}</div>
            <div className="font-mono text-xs text-muted-foreground truncate">{user?.email ?? "—"}</div>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {user?.role ?? "—"}
          </span>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">Change password</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Confirm your current password, then set a new one of at least 8 characters.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.06em] text-muted-foreground">Current password</label>
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setOk(false); }}
              className="w-full h-10 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Enter your current password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.06em] text-muted-foreground">New password</label>
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setOk(false); }}
              className="w-full h-10 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
            {tooShort && <p className="text-[11px] text-warning">Must be at least 8 characters.</p>}
            {sameAsCurrent && !tooShort && (
              <p className="text-[11px] text-warning">New password must differ from your current one.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.06em] text-muted-foreground">Confirm new password</label>
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setOk(false); }}
              className="w-full h-10 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Repeat new password"
              required
            />
            {mismatch && <p className="text-[11px] text-destructive">Passwords do not match.</p>}
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Show passwords
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : ok ? <Check className="size-4" /> : <KeyRound className="size-4" />}
              {busy ? "Updating…" : ok ? "Updated" : "Update password"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
