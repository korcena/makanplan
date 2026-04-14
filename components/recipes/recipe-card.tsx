import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type RecipeCardData = {
  id: string;
  title: string;
  tags: string[];
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
};

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const totalMin = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  return (
    <Link href={`/recipes/${recipe.id}`} className="block focus:outline-none">
      <Card className="hover:shadow-warm-lg transition-shadow h-full">
        <CardHeader>
          <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
          <CardDescription className="flex items-center gap-3 text-xs">
            {totalMin > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {totalMin} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {recipe.servings}
            </span>
          </CardDescription>
        </CardHeader>
        {recipe.tags.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 4).map((t) => (
                <Badge key={t} variant="soft">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
