import { ChefHat } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <ChefHat className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="font-bold text-lg">MakanPlan</div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">{children}</div>
    </div>
  );
}
