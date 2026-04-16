import { redirect } from "next/navigation";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  householdId: string | null;
  role: "OWNER" | "MEMBER";
};

/**
 * Return the Supabase-authenticated user, or `null` if the request has no
 * valid session.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Ensure a `User` row exists in our database for the given Supabase auth
 * user, creating one on first sign-in. Returns the app-facing user shape.
 */
export async function getOrCreateDbUser(authUser: AuthUser): Promise<AppUser> {
  const email = authUser.email ?? "";
  const rawMetaName = (authUser.user_metadata?.name as string | undefined)?.trim();
  const fallbackName = email ? email.split("@")[0] : "User";
  const name = rawMetaName && rawMetaName.length > 0 ? rawMetaName : fallbackName;

  const dbUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: { email },
    create: { id: authUser.id, email, name },
    select: { id: true, email: true, name: true, householdId: true, role: true },
  });

  return dbUser;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  return getOrCreateDbUser(authUser);
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireHousehold(): Promise<{ user: AppUser; householdId: string }> {
  const user = await requireUser();
  if (!user.householdId) redirect("/household");
  return { user, householdId: user.householdId };
}
