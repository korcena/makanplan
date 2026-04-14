"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function RecipeActions({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const onDelete = async () => {
    if (!confirm("Delete this recipe? This removes it from meal plans too.")) return;
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (!res.ok) return toast("Failed to delete", "error");
    toast("Deleted", "success");
    router.push("/recipes");
    router.refresh();
  };

  return (
    <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Delete">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
