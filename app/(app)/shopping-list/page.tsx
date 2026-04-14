import { requireHousehold } from "@/lib/session";
import { ShoppingListClient } from "./shopping-list-client";

export default async function ShoppingListPage() {
  await requireHousehold();
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-4">Shopping list</h1>
      <ShoppingListClient />
    </div>
  );
}
