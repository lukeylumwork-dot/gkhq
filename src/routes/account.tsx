import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/primitives";
import { toast } from "sonner";

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

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const tooShort = pw.length > 0 && pw.length < 8;
  const mismatch = confirm.length > 0 && pw !== confirm;
  const canSubmit = pw.length >= 8 && pw === confirm && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setOk(false);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not update password");
      return;
    }
    setOk(true);
    setPw("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Account" description="Manage your sign-in credentials." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] mb-3">Your account</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{user?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono text-xs">{user?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="uppercase tracking-wider text-xs">{user?.role ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Change password">
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.06em] text-muted-foreground">New password</label>
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setOk(false); }}
                className="mt-1 w-full h-9 px-2 rounded-md bg-input/60 border border-border text-sm"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              {tooShort && <p className="text-[11px] text-warning mt-1">Must be at least 8 characters.</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.06em] text-muted-foreground">Confirm password</label>
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setOk(false); }}
                className="mt-1 w-full h-9 px-2 rounded-md bg-input/60 border border-border text-sm"
                required
              />
              {mismatch && <p className="text-[11px] text-destructive mt-1">Passwords do not match.</p>}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Show passwords
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : ok ? <Check className="size-4" /> : <KeyRound className="size-4" />}
              {busy ? "Updating…" : ok ? "Updated" : "Update password"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
