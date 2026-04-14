export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect all page routes except:
     * - /login, /register
     * - /api/* (API routes handle auth themselves and return JSON)
     * - NextAuth internals are under /api/* anyway
     * - Static assets and public files
     */
    "/((?!api|login|register|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
