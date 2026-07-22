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
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

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
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

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

const createUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  title: z.string().max(120).optional().default(""),
  role: z.enum(ROLE_VALUES).nullable(),
  password: z.string().min(8).max(200).optional(),
});

function initialsOf(name: string, email: string): string {
  const src = (name || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const password =
      data.password ??
      `${crypto.randomUUID().replace(/-/g, "")}Aa1!`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        title: data.title ?? "",
        initials: initialsOf(data.name, data.email),
      },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }

    const userId = created.user.id;

    // handle_new_user trigger seeds profile + default mentor role.
    // Upsert to ensure fields are correct, then set the requested role.
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: data.email,
        name: data.name,
        title: data.title ?? "",
        initials: initialsOf(data.name, data.email),
      });
    if (profErr) throw new Error(profErr.message);

    const { error: delRolesErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delRolesErr) throw new Error(delRolesErr.message);

    if (data.role) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }

    return { ok: true as const, userId, tempPassword: data.password ? null : password };
  });

const inviteUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  title: z.string().max(120).optional().default(""),
  role: z.enum(ROLE_VALUES).nullable(),
  redirectTo: z.string().url(),
});

export const inviteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteUserInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const initials = initialsOf(data.name, data.email);
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        redirectTo: data.redirectTo,
        data: { name: data.name, title: data.title ?? "", initials },
      },
    });
    if (linkErr || !link?.user) {
      throw new Error(linkErr?.message ?? "Failed to generate invite link");
    }

    const userId = link.user.id;

    // Trigger seeded a profile with mentor role; upsert canonical fields and set requested role.
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: data.email,
        name: data.name,
        title: data.title ?? "",
        initials,
      });
    if (profErr) throw new Error(profErr.message);

    const { error: delRolesErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delRolesErr) throw new Error(delRolesErr.message);

    if (data.role) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }

    return {
      ok: true as const,
      userId,
      email: data.email,
      inviteLink: link.properties?.action_link ?? "",
    };
  });

const deleteUserInput = z.object({ userId: z.string().uuid() });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteUserInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own account from this screen.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    // profiles and user_roles rows cascade via FK on auth.users delete.
    return { ok: true as const };
  });

const resetPasswordInput = z.object({ userId: z.string().uuid() });

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPasswordInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: myRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    if (!myRoles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    if (data.userId === context.userId) {
      throw new Error("You cannot reset your own password from this screen.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = `${crypto.randomUUID().replace(/-/g, "")}Aa1!`;

    const { data: updated, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: tempPassword },
    );
    if (updErr || !updated?.user) {
      throw new Error(updErr?.message ?? "Failed to reset password");
    }

    const { logPasswordChange } = await import(
      "@/lib/security/password-audit.server"
    );
    await logPasswordChange({
      userId: data.userId,
      actorId: context.userId,
      eventType: "admin_reset",
    });

    return { ok: true as const, email: updated.user.email ?? "", tempPassword };
  });

