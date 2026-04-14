import { PrismaClient, IngredientCategory, MealSlot } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, startOfWeek } from "date-fns";

const prisma = new PrismaClient();

type SeedIngredient = {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  cals: number;
  p: number;
  c: number;
  f: number;
};

type SeedRecipe = {
  title: string;
  tags: string[];
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  instructions: string;
  notes: string | null;
  ingredients: SeedIngredient[];
};

const recipes: SeedRecipe[] = [
  {
    title: "Chicken Stir Fry",
    tags: ["quick", "dinner", "asian"],
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    instructions:
      "1. Slice chicken and vegetables.\n2. Heat oil in a wok over high heat.\n3. Stir-fry chicken until cooked through, 4-5 minutes.\n4. Add vegetables and stir-fry 3-4 minutes.\n5. Stir in sauce and cook 1 more minute.\n6. Serve over rice.",
    notes: "Great with brown rice or noodles.",
    ingredients: [
      { name: "chicken breast", quantity: 1.5, unit: "lbs", category: "MEAT", cals: 750, p: 140, c: 0, f: 18 },
      { name: "broccoli florets", quantity: 3, unit: "cups", category: "PRODUCE", cals: 93, p: 7, c: 18, f: 1 },
      { name: "bell pepper", quantity: 2, unit: "pieces", category: "PRODUCE", cals: 60, p: 2, c: 14, f: 0 },
      { name: "garlic cloves", quantity: 3, unit: "cloves", category: "PRODUCE", cals: 14, p: 1, c: 3, f: 0 },
      { name: "soy sauce", quantity: 3, unit: "tbsp", category: "PANTRY", cals: 30, p: 3, c: 3, f: 0 },
      { name: "vegetable oil", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 240, p: 0, c: 0, f: 28 },
      { name: "jasmine rice", quantity: 2, unit: "cups", category: "PANTRY", cals: 1300, p: 26, c: 288, f: 2 },
    ],
  },
  {
    title: "Overnight Oats",
    tags: ["breakfast", "vegetarian", "quick"],
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    instructions:
      "1. Combine oats, milk, yogurt, and maple syrup in a jar.\n2. Stir well, cover, and refrigerate overnight.\n3. Top with berries and nuts before serving.",
    notes: "Keeps for up to 3 days.",
    ingredients: [
      { name: "rolled oats", quantity: 1, unit: "cup", category: "PANTRY", cals: 300, p: 10, c: 54, f: 5 },
      { name: "milk", quantity: 1, unit: "cup", category: "DAIRY", cals: 150, p: 8, c: 12, f: 8 },
      { name: "greek yogurt", quantity: 0.5, unit: "cup", category: "DAIRY", cals: 75, p: 10, c: 4, f: 2 },
      { name: "maple syrup", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 104, p: 0, c: 27, f: 0 },
      { name: "mixed berries", quantity: 1, unit: "cup", category: "PRODUCE", cals: 70, p: 1, c: 17, f: 0 },
      { name: "almonds", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 90, p: 3, c: 3, f: 8 },
    ],
  },
  {
    title: "Caesar Salad",
    tags: ["lunch", "salad", "quick"],
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    instructions:
      "1. Chop romaine and place in a large bowl.\n2. Whisk together dressing ingredients.\n3. Toss romaine with dressing.\n4. Top with croutons and parmesan.",
    notes: null,
    ingredients: [
      { name: "romaine lettuce", quantity: 2, unit: "heads", category: "PRODUCE", cals: 80, p: 6, c: 16, f: 0 },
      { name: "parmesan cheese", quantity: 0.5, unit: "cup", category: "DAIRY", cals: 216, p: 20, c: 2, f: 14 },
      { name: "croutons", quantity: 1, unit: "cup", category: "BAKERY", cals: 120, p: 4, c: 20, f: 3 },
      { name: "caesar dressing", quantity: 0.5, unit: "cup", category: "PANTRY", cals: 640, p: 4, c: 4, f: 64 },
      { name: "lemon", quantity: 1, unit: "piece", category: "PRODUCE", cals: 17, p: 1, c: 5, f: 0 },
    ],
  },
  {
    title: "Spaghetti Bolognese",
    tags: ["dinner", "italian", "pasta"],
    servings: 6,
    prepTimeMinutes: 15,
    cookTimeMinutes: 45,
    instructions:
      "1. Brown beef in a large pot, then remove.\n2. Sauté onions, carrots, and garlic until soft.\n3. Add beef back with tomatoes, stock, and herbs.\n4. Simmer 30 minutes.\n5. Cook spaghetti al dente.\n6. Serve sauce over pasta with parmesan.",
    notes: "Even better the next day.",
    ingredients: [
      { name: "ground beef", quantity: 1, unit: "lb", category: "MEAT", cals: 1120, p: 80, c: 0, f: 88 },
      { name: "onion", quantity: 1, unit: "piece", category: "PRODUCE", cals: 40, p: 1, c: 9, f: 0 },
      { name: "carrot", quantity: 2, unit: "pieces", category: "PRODUCE", cals: 50, p: 1, c: 12, f: 0 },
      { name: "garlic cloves", quantity: 3, unit: "cloves", category: "PRODUCE", cals: 14, p: 1, c: 3, f: 0 },
      { name: "crushed tomatoes", quantity: 28, unit: "oz", category: "PANTRY", cals: 200, p: 8, c: 44, f: 2 },
      { name: "beef stock", quantity: 1, unit: "cup", category: "PANTRY", cals: 30, p: 4, c: 3, f: 1 },
      { name: "spaghetti", quantity: 1, unit: "lb", category: "PANTRY", cals: 1580, p: 58, c: 322, f: 6 },
      { name: "parmesan cheese", quantity: 0.5, unit: "cup", category: "DAIRY", cals: 216, p: 20, c: 2, f: 14 },
      { name: "olive oil", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 240, p: 0, c: 0, f: 28 },
    ],
  },
  {
    title: "Banana Smoothie",
    tags: ["breakfast", "snack", "quick", "vegetarian"],
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    instructions:
      "1. Add all ingredients to blender.\n2. Blend until smooth.\n3. Serve immediately.",
    notes: null,
    ingredients: [
      { name: "banana", quantity: 2, unit: "pieces", category: "PRODUCE", cals: 210, p: 3, c: 54, f: 1 },
      { name: "milk", quantity: 1.5, unit: "cups", category: "DAIRY", cals: 225, p: 12, c: 18, f: 12 },
      { name: "peanut butter", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 190, p: 8, c: 6, f: 16 },
      { name: "honey", quantity: 1, unit: "tbsp", category: "PANTRY", cals: 64, p: 0, c: 17, f: 0 },
      { name: "ice", quantity: 1, unit: "cup", category: "FROZEN", cals: 0, p: 0, c: 0, f: 0 },
    ],
  },
  {
    title: "Grilled Salmon with Lemon",
    tags: ["dinner", "seafood", "healthy"],
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    instructions:
      "1. Preheat grill to medium-high.\n2. Rub salmon with olive oil, salt, and pepper.\n3. Grill skin-side down 6 minutes, flip and cook 4 more.\n4. Squeeze lemon over fillets and garnish with dill.",
    notes: "Serve with roasted vegetables or rice.",
    ingredients: [
      { name: "salmon fillets", quantity: 4, unit: "pieces", category: "SEAFOOD", cals: 960, p: 104, c: 0, f: 60 },
      { name: "olive oil", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 240, p: 0, c: 0, f: 28 },
      { name: "lemon", quantity: 1, unit: "piece", category: "PRODUCE", cals: 17, p: 1, c: 5, f: 0 },
      { name: "fresh dill", quantity: 2, unit: "tbsp", category: "PRODUCE", cals: 2, p: 0, c: 0, f: 0 },
      { name: "salt", quantity: 1, unit: "tsp", category: "PANTRY", cals: 0, p: 0, c: 0, f: 0 },
      { name: "black pepper", quantity: 0.5, unit: "tsp", category: "PANTRY", cals: 3, p: 0, c: 1, f: 0 },
    ],
  },
  {
    title: "Beef Tacos",
    tags: ["dinner", "mexican", "quick"],
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    instructions:
      "1. Brown beef in a skillet, breaking it up.\n2. Drain fat, add taco seasoning and water.\n3. Simmer until thickened.\n4. Warm tortillas.\n5. Assemble tacos with beef, cheese, lettuce, and salsa.",
    notes: "Add sour cream or avocado for extra richness.",
    ingredients: [
      { name: "ground beef", quantity: 1, unit: "lb", category: "MEAT", cals: 1120, p: 80, c: 0, f: 88 },
      { name: "taco seasoning", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 40, p: 1, c: 8, f: 1 },
      { name: "tortillas", quantity: 8, unit: "pieces", category: "BAKERY", cals: 560, p: 16, c: 96, f: 12 },
      { name: "cheddar cheese", quantity: 1, unit: "cup", category: "DAIRY", cals: 455, p: 28, c: 4, f: 37 },
      { name: "lettuce", quantity: 1, unit: "cup", category: "PRODUCE", cals: 10, p: 1, c: 2, f: 0 },
      { name: "tomato", quantity: 1, unit: "piece", category: "PRODUCE", cals: 22, p: 1, c: 5, f: 0 },
      { name: "salsa", quantity: 0.5, unit: "cup", category: "PANTRY", cals: 36, p: 2, c: 8, f: 0 },
    ],
  },
  {
    title: "Vegetable Soup",
    tags: ["lunch", "vegetarian", "soup", "healthy"],
    servings: 6,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    instructions:
      "1. Sauté onion, carrot, and celery in olive oil.\n2. Add garlic and cook briefly.\n3. Add stock, tomatoes, beans, and herbs.\n4. Simmer 20-25 minutes.\n5. Season to taste and serve.",
    notes: "Freezes well.",
    ingredients: [
      { name: "onion", quantity: 1, unit: "piece", category: "PRODUCE", cals: 40, p: 1, c: 9, f: 0 },
      { name: "carrot", quantity: 2, unit: "pieces", category: "PRODUCE", cals: 50, p: 1, c: 12, f: 0 },
      { name: "celery", quantity: 2, unit: "stalks", category: "PRODUCE", cals: 12, p: 1, c: 3, f: 0 },
      { name: "garlic cloves", quantity: 3, unit: "cloves", category: "PRODUCE", cals: 14, p: 1, c: 3, f: 0 },
      { name: "vegetable stock", quantity: 6, unit: "cups", category: "PANTRY", cals: 90, p: 6, c: 18, f: 0 },
      { name: "diced tomatoes", quantity: 14, unit: "oz", category: "PANTRY", cals: 100, p: 4, c: 22, f: 1 },
      { name: "cannellini beans", quantity: 15, unit: "oz", category: "PANTRY", cals: 350, p: 24, c: 62, f: 2 },
      { name: "olive oil", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 240, p: 0, c: 0, f: 28 },
    ],
  },
  {
    title: "Avocado Toast",
    tags: ["breakfast", "vegetarian", "quick"],
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 3,
    instructions:
      "1. Toast bread to desired crispness.\n2. Mash avocado with lemon juice and salt.\n3. Spread on toast.\n4. Top with chili flakes and a drizzle of olive oil.",
    notes: "Add a poached egg for extra protein.",
    ingredients: [
      { name: "sourdough bread", quantity: 2, unit: "slices", category: "BAKERY", cals: 220, p: 8, c: 44, f: 2 },
      { name: "avocado", quantity: 1, unit: "piece", category: "PRODUCE", cals: 240, p: 3, c: 12, f: 22 },
      { name: "lemon juice", quantity: 1, unit: "tsp", category: "PRODUCE", cals: 1, p: 0, c: 0, f: 0 },
      { name: "chili flakes", quantity: 0.25, unit: "tsp", category: "PANTRY", cals: 1, p: 0, c: 0, f: 0 },
      { name: "olive oil", quantity: 1, unit: "tsp", category: "PANTRY", cals: 40, p: 0, c: 0, f: 5 },
      { name: "salt", quantity: 0.25, unit: "tsp", category: "PANTRY", cals: 0, p: 0, c: 0, f: 0 },
    ],
  },
  {
    title: "Greek Yogurt Parfait",
    tags: ["breakfast", "snack", "quick", "vegetarian"],
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    instructions:
      "1. Layer yogurt, granola, and berries in a glass.\n2. Drizzle honey on top.\n3. Serve immediately.",
    notes: null,
    ingredients: [
      { name: "greek yogurt", quantity: 2, unit: "cups", category: "DAIRY", cals: 300, p: 40, c: 16, f: 8 },
      { name: "granola", quantity: 1, unit: "cup", category: "PANTRY", cals: 500, p: 12, c: 64, f: 22 },
      { name: "mixed berries", quantity: 1, unit: "cup", category: "PRODUCE", cals: 70, p: 1, c: 17, f: 0 },
      { name: "honey", quantity: 2, unit: "tbsp", category: "PANTRY", cals: 128, p: 0, c: 34, f: 0 },
    ],
  },
];

async function main() {
  const email = "test@makanplan.com";
  const passwordHash = await bcrypt.hash("password123", 10);

  // Clean slate for seed data (keep foreign users alone)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.householdId) {
      await prisma.household.delete({ where: { id: existing.householdId } }).catch(() => null);
    }
    await prisma.user.delete({ where: { email } }).catch(() => null);
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo User",
      passwordHash,
    },
  });

  const household = await prisma.household.create({
    data: {
      name: "Demo Kitchen",
      inviteCode: "DEMO" + randCode(4),
      members: { connect: { id: user.id } },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: household.id, role: "OWNER" },
  });

  const createdRecipes = [];
  for (const r of recipes) {
    const rec = await prisma.recipe.create({
      data: {
        householdId: household.id,
        createdById: user.id,
        title: r.title,
        tags: r.tags,
        servings: r.servings,
        prepTimeMinutes: r.prepTimeMinutes,
        cookTimeMinutes: r.cookTimeMinutes,
        instructions: r.instructions,
        notes: r.notes,
        ingredients: {
          create: r.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            category: i.category,
            estimatedCalories: i.cals,
            estimatedProteinG: i.p,
            estimatedCarbsG: i.c,
            estimatedFatG: i.f,
          })),
        },
      },
    });
    createdRecipes.push(rec);
  }

  const byTitle = Object.fromEntries(createdRecipes.map((r) => [r.title, r]));
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const schedule: Array<{ dayOffset: number; slot: MealSlot; title: string }> = [
    { dayOffset: 0, slot: "BREAKFAST", title: "Overnight Oats" },
    { dayOffset: 0, slot: "LUNCH", title: "Caesar Salad" },
    { dayOffset: 0, slot: "DINNER", title: "Chicken Stir Fry" },
    { dayOffset: 1, slot: "BREAKFAST", title: "Avocado Toast" },
    { dayOffset: 1, slot: "LUNCH", title: "Vegetable Soup" },
    { dayOffset: 1, slot: "DINNER", title: "Spaghetti Bolognese" },
    { dayOffset: 2, slot: "BREAKFAST", title: "Greek Yogurt Parfait" },
    { dayOffset: 2, slot: "DINNER", title: "Grilled Salmon with Lemon" },
    { dayOffset: 3, slot: "BREAKFAST", title: "Banana Smoothie" },
    { dayOffset: 3, slot: "LUNCH", title: "Caesar Salad" },
    { dayOffset: 3, slot: "DINNER", title: "Beef Tacos" },
    { dayOffset: 4, slot: "BREAKFAST", title: "Overnight Oats" },
    { dayOffset: 4, slot: "DINNER", title: "Vegetable Soup" },
    { dayOffset: 4, slot: "SNACK", title: "Banana Smoothie" },
    { dayOffset: 5, slot: "BREAKFAST", title: "Avocado Toast" },
    { dayOffset: 5, slot: "DINNER", title: "Chicken Stir Fry" },
    { dayOffset: 6, slot: "BREAKFAST", title: "Greek Yogurt Parfait" },
    { dayOffset: 6, slot: "LUNCH", title: "Caesar Salad" },
    { dayOffset: 6, slot: "DINNER", title: "Spaghetti Bolognese" },
  ];

  for (const s of schedule) {
    const recipe = byTitle[s.title];
    if (!recipe) continue;
    const date = addDays(weekStart, s.dayOffset);
    await prisma.mealPlan.create({
      data: {
        householdId: household.id,
        createdById: user.id,
        date,
        slot: s.slot,
        recipeId: recipe.id,
        servings: recipe.servings,
      },
    });
  }

  console.log(`Seeded: ${user.email} / password123`);
  console.log(`Household: ${household.name} (invite: ${household.inviteCode})`);
  console.log(`Recipes: ${createdRecipes.length}`);
  console.log(`Meal plans: ${schedule.length}`);
}

function randCode(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
