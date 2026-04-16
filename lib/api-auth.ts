import { NextResponse } from "next/server";
import { getOrCreateDbUser, type AppUser } from "./session";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Resolve the current user for an API route. Returns either the app-facing
 * user or a 401 NextResponse to return immediately.
 */
export async function requireApiUser(): Promise<
  { user: AppUser } | { response: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const user = await getOrCreateDbUser(authUser);
  return { user };
}

export async function requireApiHousehold(): Promise<
  { user: AppUser; householdId: string } | { response: NextResponse }
> {
  const result = await requireApiUser();
  if ("response" in result) return result;
  if (!result.user.householdId) {
    return {
      response: NextResponse.json({ error: "No household" }, { status: 400 }),
    };
  }
  return { user: result.user, householdId: result.user.householdId };
}
