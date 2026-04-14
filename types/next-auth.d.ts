import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      householdId: string | null;
      role?: "OWNER" | "MEMBER";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    householdId?: string | null;
    role?: "OWNER" | "MEMBER";
  }
}
