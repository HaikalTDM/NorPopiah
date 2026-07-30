/**
 * Recipe Cost Calculation Engine
 *
 * Pure calculation functions + DB-aware async wrappers.
 * All core math is in pure functions — testable without a database.
 */

import { db, type Recipe, type Ingredient } from "../db";
import {
  toBaseUnit,
  getBaseUnit,
  costPerBaseUnit,
  type Unit,
} from "./units";
import {
  suggestedPriceFromMargin,
  calculateMarginPercent,
  calculateMarkupPercent,
  calculateProfit,
  type PricingBreakdown,
} from "./profit";

// ─── Types ────────────────────────────────────────────────────────

export interface IngredientCostLine {
  ingredientId: number;
  name: string;
  category: Ingredient["category"];
  purchaseUnit: Unit;
  usageQty: number;
  usageUnit: Unit;
  usageInBaseUnit: number;
  costPerBaseUnit: number;
  totalCost: number;
}

export interface RecipeCostBreakdown {
  recipeId: number;
  recipeName: string;

  // Separated by category
  ingredientLines: IngredientCostLine[];
  packagingLines: IngredientCostLine[];

  // Cost components
  totalIngredientCost: number;
  totalPackagingCost: number; // auto-calculated
  wasteCost: number;
  laborBufferPerBatch: number;

  // Totals
  totalProductionCost: number;
  costPerPiece: number;
  batchYield: number;

  // Pricing
  suggestedPrice: number;
  targetMarginPercent: number;
  actualMarginPercent: number;
  markupPercent: number;
  profitPerPiece: number;
}

// ─── Pure Calculations ────────────────────────────────────────────

/**
 * Calculate the cost contribution of a single ingredient used in a recipe.
 *
 * Automatically converts between purchase unit and usage unit.
 *
 * Example:
 *   Purchased: 25 kg flour at RM75
 *   Usage:     250 g
 *   → cost = 75 / (25 * 1000) * 250 = RM0.75
 */
export function calcIngredientLine(
  ingredient: Ingredient,
  usageQty: number,
  usageUnit: Unit,
): IngredientCostLine | null {
  if (!ingredient.id) return null;

  const costPerBase = costPerBaseUnit(
    ingredient.purchase_price,
    ingredient.purchase_qty,
    ingredient.unit,
  );

  const usageInBase = toBaseUnit(usageQty, usageUnit);

  return {
    ingredientId: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    purchaseUnit: ingredient.unit,
    usageQty,
    usageUnit,
    usageInBaseUnit: usageInBase,
    costPerBaseUnit: costPerBase,
    totalCost: costPerBase * usageInBase,
  };
}

/**
 * Calculate the waste-adjusted cost.
 *
 * Waste is applied to the ingredient cost: if 5% waste, the effective
 * ingredient cost increases by 5% because you need to buy more to cover
 * what gets wasted.
 *
 * Formula: waste_cost = ingredient_cost * (waste_percentage / 100)
 */
export function calcWasteCost(
  ingredientCost: number,
  wastePercentage: number,
): number {
  return ingredientCost * (wastePercentage / 100);
}

/**
 * Calculate total production cost for a batch.
 *
 * total = ingredient_cost + waste_cost + packaging + labor
 */
export function calcTotalProductionCost(
  ingredientCost: number,
  wastePercentage: number,
  packagingCostPerBatch: number,
  laborBufferPerBatch: number,
): number {
  const wasteCost = calcWasteCost(ingredientCost, wastePercentage);
  return ingredientCost + wasteCost + packagingCostPerBatch + laborBufferPerBatch;
}

/**
 * Calculate cost per piece.
 */
export function calcCostPerPiece(
  totalProductionCost: number,
  batchYield: number,
): number {
  if (batchYield <= 0) return 0;
  return totalProductionCost / batchYield;
}

// ─── Full Recipe Breakdown (pure) ─────────────────────────────────

export interface PureRecipeInput {
  recipe: Recipe;
  ingredients: Array<{
    ingredient: Ingredient;
    usageQty: number;
    usageUnit: Unit;
  }>;
}

/**
 * Full recipe cost breakdown — pure function, no DB access.
 * Takes all data as parameters.
 */
export function calcRecipeCostBreakdown(
  input: PureRecipeInput,
): RecipeCostBreakdown | null {
  const { recipe, ingredients } = input;
  if (!recipe.id) return null;

  // Calculate each ingredient line — split by category
  const ingredientLines: IngredientCostLine[] = [];
  const packagingLines: IngredientCostLine[] = [];
  let totalIngredientCost = 0;
  let totalPackagingCost = 0;

  for (const item of ingredients) {
    const line = calcIngredientLine(item.ingredient, item.usageQty, item.usageUnit);
    if (!line) continue;

    if (item.ingredient.category === "packaging") {
      packagingLines.push(line);
      totalPackagingCost += line.totalCost;
    } else {
      ingredientLines.push(line);
      totalIngredientCost += line.totalCost;
    }
  }

  const wasteCost = calcWasteCost(totalIngredientCost, recipe.waste_percentage);
  const totalProductionCost = calcTotalProductionCost(
    totalIngredientCost,
    recipe.waste_percentage,
    totalPackagingCost,
    recipe.labor_buffer,
  );

  const costPerPiece = calcCostPerPiece(totalProductionCost, recipe.batch_yield_pcs);
  const suggestedPrice = suggestedPriceFromMargin(
    costPerPiece,
    recipe.target_margin_percent,
  );

  const profitResult = calculateProfit(costPerPiece, suggestedPrice);

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    ingredientLines,
    packagingLines,
    totalIngredientCost,
    totalPackagingCost,
    wasteCost,
    laborBufferPerBatch: recipe.labor_buffer,
    totalProductionCost,
    costPerPiece,
    batchYield: recipe.batch_yield_pcs,
    suggestedPrice,
    targetMarginPercent: recipe.target_margin_percent,
    actualMarginPercent: calculateMarginPercent(costPerPiece, suggestedPrice),
    markupPercent: calculateMarkupPercent(costPerPiece, suggestedPrice),
    profitPerPiece: profitResult.profitPerPiece,
  };
}

// ─── DB-Aware Functions (for UI components) ────────────────────────

/**
 * Load a recipe from the DB and calculate its full cost breakdown.
 * This is the main function UI components should call.
 */
export async function getRecipeCost(
  recipeId: number,
): Promise<RecipeCostBreakdown | null> {
  const recipe = await db.recipes.get(recipeId);
  if (!recipe) return null;

  const items = await db.recipe_items
    .where("recipe_id")
    .equals(recipeId)
    .toArray();

  const ingredients: PureRecipeInput["ingredients"] = [];
  for (const item of items) {
    const ingredient = await db.ingredients.get(item.ingredient_id);
    if (!ingredient) continue;
    ingredients.push({
      ingredient,
      usageQty: item.qty_used,
      usageUnit: ingredient.unit, // recipe items use same unit as ingredient purchase
    });
  }

  return calcRecipeCostBreakdown({ recipe, ingredients });
}

/**
 * Scale a recipe to a target quantity and calculate costs.
 */
export async function getScaledRecipeCost(
  recipeId: number,
  targetPieces: number,
): Promise<{
  breakdown: RecipeCostBreakdown;
  scaleFactor: number;
  totalRevenue: number;
  totalProfit: number;
} | null> {
  const breakdown = await getRecipeCost(recipeId);
  if (!breakdown) return null;

  const scaleFactor = targetPieces / breakdown.batchYield;
  const totalRevenue = breakdown.suggestedPrice * targetPieces;
  const totalProfit = breakdown.profitPerPiece * targetPieces;

  return { breakdown, scaleFactor, totalRevenue, totalProfit };
}

/**
 * Get margin data for all recipes — sorted by margin, highest first.
 */
export async function getAllRecipeMargins(): Promise<
  Array<{
    id: number;
    name: string;
    marginPerPiece: number;
    suggestedPrice: number;
    costPerPiece: number;
    marginPercent: number;
  }>
> {
  const recipes = await db.recipes.toArray();
  const results = [];

  for (const recipe of recipes) {
    if (!recipe.id) continue;
    const breakdown = await getRecipeCost(recipe.id);
    if (!breakdown) continue;

    results.push({
      id: recipe.id,
      name: recipe.name,
      marginPerPiece: breakdown.profitPerPiece,
      suggestedPrice: breakdown.suggestedPrice,
      costPerPiece: breakdown.costPerPiece,
      marginPercent: breakdown.actualMarginPercent,
    });
  }

  return results.sort((a, b) => b.marginPerPiece - a.marginPerPiece);
}
