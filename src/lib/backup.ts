import { db } from "./db";

/**
 * Export entire database as a downloadable JSON file.
 */
export async function exportDatabase(): Promise<void> {
  const ingredients = await db.ingredients.toArray();
  const recipes = await db.recipes.toArray();
  const recipeItems = await db.recipe_items.toArray();

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    ingredients,
    recipes,
    recipe_items: recipeItems,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `norpopiah-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import database from a backup JSON file.
 * WARNING: Clears existing data before importing.
 */
export async function importDatabase(file: File): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.ingredients || !backup.recipes || !backup.recipe_items) {
      return { success: false, message: "Invalid backup file format" };
    }

    // Clear existing data
    await db.ingredients.clear();
    await db.recipes.clear();
    await db.recipe_items.clear();

    // Import ingredients (preserve original IDs for recipe_items to work)
    await db.ingredients.bulkAdd(
      backup.ingredients.map((i: { id?: number }) => ({
        ...i,
        id: undefined, // let Dexie auto-assign
      })),
    );

    // We need a mapping from old IDs to new IDs for recipe_items
    // Since we can't easily maintain foreign keys across import, we do a best-effort import
    // by importing recipes first, then mapping recipe_items by name

    // For simplicity, import recipes with new IDs
    const oldToNewRecipeId = new Map<number, number>();
    for (const recipe of backup.recipes) {
      const oldId = recipe.id;
      const { id: oldRecipeId, ...rest } = recipe;
      const newId = await db.recipes.add(rest as typeof recipe);
      if (oldId !== undefined) oldToNewRecipeId.set(oldId, newId);
    }

    // Map old ingredient IDs to new ones (by matching name + unit)
    const allIngredients = await db.ingredients.toArray();
    const oldToNewIngredientId = new Map<number, number>();
    for (const oldIng of backup.ingredients) {
      const match = allIngredients.find(
        (ni) => ni.name === oldIng.name && ni.unit === oldIng.unit,
      );
      if (match && match.id && oldIng.id !== undefined) {
        oldToNewIngredientId.set(oldIng.id, match.id);
      }
    }

    // Now import recipe items with remapped IDs
    const mappedItems = backup.recipe_items
      .map(
        (item: {
          recipe_id: number;
          ingredient_id: number;
          qty_used: number;
        }) => ({
          recipe_id: oldToNewRecipeId.get(item.recipe_id) ?? item.recipe_id,
          ingredient_id:
            oldToNewIngredientId.get(item.ingredient_id) ??
            item.ingredient_id,
          qty_used: item.qty_used,
        }),
      )
      .filter(
        (item: { recipe_id: number; ingredient_id: number }) =>
          item.recipe_id && item.ingredient_id,
      );

    await db.recipe_items.bulkAdd(mappedItems);

    return {
      success: true,
      message: `Imported ${backup.ingredients.length} ingredients, ${backup.recipes.length} recipes`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
