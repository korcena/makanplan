import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Supabase client for use in React Server Components, Route Handlers, and
 * Server Actions. Reads/writes auth cookies via `next/headers`.
 *
 * In RSC contexts, Next.js disallows writing to cookies; we swallow those
 * errors — `updateSession` in the middleware already takes care of refreshing
 * cookies on each request.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* Called from a Server Component — safe to ignore. */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* Called from a Server Component — safe to ignore. */
          }
        },
      },
    },
  );
}
