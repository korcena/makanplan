import { requireHousehold } from "@/lib/session";
import { MacrosClient } from "./macros-client";

export default async function MacrosPage() {
  await requireHousehold();
  return (
    <div className="container max-w-5xl py-8">
      <h1 className="text-3xl font-bold mb-1">Macros</h1>
      <p className="text-sm text-muted-foreground mb-6">Macros are estimates and may vary.</p>
      <MacrosClient />
    </div>
  );
}
