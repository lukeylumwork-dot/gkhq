import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE_VALUES = ["super_admin", "admin", "mentor_manager", "mentor"] as const;
type ManagedRole = (typeof ROLE_VALUES)[number];

export interface ManagedUserRow {
  id: string;
  email: string;
  name: string;
  initials: string;
  title: string;
  role: ManagedRole | null;
}

function precedence(roles: string[]): ManagedRole | null {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("mentor_manager")) return "mentor_manager";
  if (roles.includes("mentor")) return "mentor";
  return null;
}


export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUserRow[]> => {
    const { data: isSuper, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isSuper) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: profErr }, { data: roles, error: rolesErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,email,name,initials,title").order("email"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);
    if (profErr) throw new Error(profErr.message);
    if (rolesErr) throw new Error(rolesErr.message);

    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as string);
      byUser.set(r.user_id, arr);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      name: p.name ?? "",
      initials: p.initials ?? "",
      title: p.title ?? "",
      role: precedence(byUser.get(p.id) ?? []),
    }));
  });

const setRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLE_VALUES).nullable(),
});

export const setManagedUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isSuper, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isSuper) throw new Error("Forbidden");

    if (data.userId === context.userId) {
      throw new Error("You cannot change your own role from this screen.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);

    if (data.role) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }

    return { ok: true as const };
  });
