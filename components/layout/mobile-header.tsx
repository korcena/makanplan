"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MobileHeader() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 h-14 flex items-center justify-between no-print">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <ChefHat className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold">MakanPlan</span>
      </Link>
      <button
        onClick={signOut}
        className="p-2 text-muted-foreground"
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
