import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole =
  | "admin"
  | "executive"
  | "ops_manager"
  | "analyst"
  | "data_entry"
  | "auditor";

export type SessionProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
};

export async function requireSession(): Promise<SessionProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `profiles SELECT failed for ${user.id}: ${profileError.code ?? ""} ${profileError.message}`,
      { cause: profileError },
    );
  }
  if (!profile) {
    // No profile row despite a valid session — usually means the
    // on_auth_user_created trigger didn't fire (user pre-dates the trigger).
    throw new Error(
      `Signed-in user ${user.id} has no profile row. Did the on_auth_user_created trigger run?`,
    );
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
}

export function canWriteFacts(role: UserRole): boolean {
  return role === "admin" || role === "ops_manager" || role === "data_entry";
}

export function canDeleteFacts(role: UserRole): boolean {
  return role === "admin";
}
