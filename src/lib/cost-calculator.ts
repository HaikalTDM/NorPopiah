import { db, type Recipe, type RecipeItem, type Ingredient } from "./db";

export interface IngredientCost {
  name: string;
  unit: string;
  qty_used: number;
  cost_per_unit: number;
  total_cost: number;
}

export interface RecipeCost {
  ingredientCosts: IngredientCost[];
  total_ingredient_cost: number;
  cost_per_piece: number; // raw ingredient cost per piece
  packaging_per_piece: number;
  labor_per_piece: number;
  total_cost_per_piece: number; // all costs combined
  suggested_price: number; // with margin
  margin_per_piece: number;
  margin_percent: number;
}

/**
 * Calculate the full cost breakdown for a recipe.
 * Uses live ingredient data from the database.
 */
export async function calculateRecipeCost(
  recipeId: number,
): Promise<RecipeCost | null> {
  const recipe = await db.recipes.get(recipeId);
  if (!recipe) return null;

  const items = await db.recipe_items
    .where("recipe_id")
    .equals(recipeId)
    .toArray();

  const ingredientCosts: IngredientCost[] = [];

  for (const item of items) {
    const ingredient = await db.ingredients.get(item.ingredient_id);
    if (!ingredient) continue;

    const costPerUnit =
      ingredient.purchase_price / ingredient.purchase_qty;
    const totalCost = costPerUnit * item.qty_used;

    ingredientCosts.push({
      name: ingredient.name,
      unit: ingredient.unit,
      qty_used: item.qty_used,
      cost_per_unit: costPerUnit,
      total_cost: totalCost,
    });
  }

  const total_ingredient_cost = ingredientCosts.reduce(
    (sum, ic) => sum + ic.total_cost,
    0,
  );

  // Adjust for waste
  const wasteMultiplier = 1 + recipe.waste_percentage / 100;
  const adjusted_ingredient_cost =
    total_ingredient_cost * wasteMultiplier;

  const effective_yield =
    recipe.batch_yield_pcs * (1 - recipe.waste_percentage / 100);

  const cost_per_piece =
    effective_yield > 0
      ? adjusted_ingredient_cost / recipe.batch_yield_pcs
      : 0;

  const packaging_per_piece =
    recipe.batch_yield_pcs > 0
      ? recipe.packaging_cost / recipe.batch_yield_pcs
      : 0;

  const labor_per_piece =
    recipe.batch_yield_pcs > 0
      ? recipe.labor_buffer / recipe.batch_yield_pcs
      : 0;

  const total_cost_per_piece =
    cost_per_piece + packaging_per_piece + labor_per_piece;

  const marginMultiplier = 1 + recipe.target_margin_percent / 100;
  const suggested_price = total_cost_per_piece * marginMultiplier;
  const margin_per_piece = suggested_price - total_cost_per_piece;

  return {
    ingredientCosts,
    total_ingredient_cost,
    cost_per_piece,
    packaging_per_piece,
    labor_per_piece,
    total_cost_per_piece,
    suggested_price,
    margin_per_piece,
    margin_percent: recipe.target_margin_percent,
  };
}

/**
 * Scale a recipe to a different order quantity.
 */
export async function calculateScaledCost(
  recipeId: number,
  targetPieces: number,
): Promise<{
  recipe: Recipe;
  cost: RecipeCost;
  scaledQuantity: number;
  totalRevenue: number;
  totalProfit: number;
} | null> {
  const recipe = await db.recipes.get(recipeId);
  if (!recipe) return null;

  const cost = await calculateRecipeCost(recipeId);
  if (!cost) return null;

  const scaleFactor = targetPieces / recipe.batch_yield_pcs;
  const totalRevenue = cost.suggested_price * targetPieces;
  const totalProfit = cost.margin_per_piece * targetPieces;

  return {
    recipe,
    cost,
    scaledQuantity: targetPieces,
    totalRevenue,
    totalProfit,
  };
}

/**
 * Get margin data for all recipes (for Insights tab).
 */
export async function getAllRecipeMargins(): Promise<
  Array<{ id: number; name: string; margin: number; price: number; cost: number }>
> {
  const recipes = await db.recipes.toArray();
  const results = [];

  for (const recipe of recipes) {
    if (!recipe.id) continue;
    const cost = await calculateRecipeCost(recipe.id);
    if (!cost) continue;

    results.push({
      id: recipe.id,
      name: recipe.name,
      margin: cost.margin_per_piece,
      price: cost.suggested_price,
      cost: cost.total_cost_per_piece,
    });
  }

  return results.sort((a, b) => b.margin - a.margin); // highest margin first
}
