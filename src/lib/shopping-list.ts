import { db, type IngredientCategory } from "./db";

export interface ShoppingItem {
  ingredientId: number;
  name: string;
  category: IngredientCategory;
  unit: string;
  totalQtyNeeded: number;
  recipes: string[];
}

export interface ShoppingList {
  items: ShoppingItem[];
  ingredientItems: ShoppingItem[];
  packagingItems: ShoppingItem[];
  totalUniqueIngredients: number;
}

/**
 * Aggregates ingredients across the given recipes into a shopping list,
 * grouped by category (ingredients first, then packaging).
 */
export async function generateShoppingList(
  recipeIds: number[],
): Promise<ShoppingList> {
  if (recipeIds.length === 0) {
    return { items: [], ingredientItems: [], packagingItems: [], totalUniqueIngredients: 0 };
  }

  // Fetch all recipe items for the selected recipes
  const allRecipeItems = await db.recipe_items
    .where("recipe_id")
    .anyOf(recipeIds)
    .toArray();

  // Fetch all ingredient details needed
  const ingredientIdArr = allRecipeItems.map((ri) => ri.ingredient_id);
  const uniqueIngredientIds = ingredientIdArr.filter(
    (id, idx) => ingredientIdArr.indexOf(id) === idx,
  );
  const ingredientMap = new Map<number, (typeof allIngredients)[0]>();
  const allIngredients = await db.ingredients
    .where("id")
    .anyOf(uniqueIngredientIds)
    .toArray();
  allIngredients.forEach((ing) => {
    if (ing.id != null) {
      ingredientMap.set(ing.id, ing);
    }
  });

  // Fetch recipe names
  const recipeMap = new Map<number, string>();
  const allRecipes = await db.recipes
    .where("id")
    .anyOf(recipeIds)
    .toArray();
  allRecipes.forEach((r) => {
    if (r.id != null) {
      recipeMap.set(r.id, r.name);
    }
  });

  // Aggregate by ingredient_id — use object map for compatibility
  const aggregateMap: Record<number, { totalQty: number; recipeIds: number[] }> = {};

  allRecipeItems.forEach((ri) => {
    const existing = aggregateMap[ri.ingredient_id];
    if (existing) {
      existing.totalQty += ri.qty_used;
      if (existing.recipeIds.indexOf(ri.recipe_id) === -1) {
        existing.recipeIds.push(ri.recipe_id);
      }
    } else {
      aggregateMap[ri.ingredient_id] = {
        totalQty: ri.qty_used,
        recipeIds: [ri.recipe_id],
      };
    }
  });

  // Build shopping items
  const items: ShoppingItem[] = [];
  Object.keys(aggregateMap).forEach((key) => {
    const ingId = Number(key);
    const agg = aggregateMap[ingId];
    const ing = ingredientMap.get(ingId);
    if (!ing) return;

    const recipeNames = agg.recipeIds
      .map((rid) => recipeMap.get(rid) ?? `Recipe #${rid}`)
      .sort();

    items.push({
      ingredientId: ingId,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      totalQtyNeeded: agg.totalQty,
      recipes: recipeNames,
    });
  });

  // Sort: ingredients first, then packaging; within each group alphabetically
  const ingredientItems = items
    .filter((i) => i.category === "ingredient")
    .sort((a, b) => a.name.localeCompare(b.name));

  const packagingItems = items
    .filter((i) => i.category === "packaging")
    .sort((a, b) => a.name.localeCompare(b.name));

  const sortedItems = [...ingredientItems, ...packagingItems];

  return {
    items: sortedItems,
    ingredientItems,
    packagingItems,
    totalUniqueIngredients: sortedItems.length,
  };
}

/**
 * Formats a shopping list into plain text suitable for clipboard.
 * Format: "• Name — Qty Unit (Recipe1, Recipe2)"
 */
export function shoppingListToText(list: ShoppingList): string {
  const lines: string[] = [];

  if (list.ingredientItems.length > 0) {
    lines.push("🥬 Ingredients");
    list.ingredientItems.forEach((item) => {
      const recipeList = item.recipes.join(", ");
      lines.push(`• ${item.name} — ${item.totalQtyNeeded} ${item.unit} (${recipeList})`);
    });
  }

  if (list.packagingItems.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("📦 Packaging");
    list.packagingItems.forEach((item) => {
      const recipeList = item.recipes.join(", ");
      lines.push(`• ${item.name} — ${item.totalQtyNeeded} ${item.unit} (${recipeList})`);
    });
  }

  return lines.join("\n");
}
