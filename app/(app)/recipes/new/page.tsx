import { requireHousehold } from "@/lib/session";
import { NewRecipeClient } from "./new-recipe-client";

export default async function NewRecipePage() {
  await requireHousehold();
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-2">Add a new recipe</h1>
      <p className="text-muted-foreground mb-6">
        Paste text, import from a URL, or enter manually.
      </p>
      <NewRecipeClient />
    </div>
  );
}
