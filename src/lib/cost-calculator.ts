/**
 * Legacy compatibility layer.
 *
 * All calculation logic lives in src/lib/calculations/.
 * This file adapts the new API to the original interface so
 * existing UI components continue to work unchanged.
 *
 * New code should import directly from "@/lib/calculations".
 */

import type { Recipe } from "./db";
import {
  getRecipeCost as getRecipeCostNew,
  getScaledRecipeCost as getScaledCostNew,
  getAllRecipeMargins as getAllMarginsNew,
  type RecipeCostBreakdown,
} from "./calculations";
import { suggestedPriceFromMargin, calculateMarginPercent } from "./calculations/profit";

// ─── Legacy Types ─────────────────────────────────────────────────

export interface IngredientCost {
  name: string;
  unit: string;
  qty_used: number;
  cost_per_unit: number;
  total_cost: number;
  category?: string;
}

export interface RecipeCost {
  ingredientCosts: IngredientCost[];
  packagingCosts: IngredientCost[];
  total_ingredient_cost: number;
  total_packaging_cost: number;
  cost_per_piece: number;
  packaging_per_piece: number;
  labor_per_piece: number;
  total_cost_per_piece: number;
  suggested_price: number;
  margin_per_piece: number;
  margin_percent: number;
}

// ─── Adapter ──────────────────────────────────────────────────────

function adaptBreakdown(b: RecipeCostBreakdown): RecipeCost {
  const mapLine = (line: typeof b.ingredientLines[0]) => ({
    name: line.name,
    unit: line.purchaseUnit,
    qty_used: line.usageQty,
    cost_per_unit: line.costPerBaseUnit,
    total_cost: line.totalCost,
    category: line.category,
  });

  return {
    ingredientCosts: b.ingredientLines.map(mapLine),
    packagingCosts: b.packagingLines.map(mapLine),
    total_ingredient_cost: b.totalIngredientCost,
    total_packaging_cost: b.totalPackagingCost,
    cost_per_piece: b.costPerPiece,
    packaging_per_piece:
      b.batchYield > 0 ? b.totalPackagingCost / b.batchYield : 0,
    labor_per_piece:
      b.batchYield > 0 ? b.laborBufferPerBatch / b.batchYield : 0,
    total_cost_per_piece: b.costPerPiece,
    suggested_price: b.suggestedPrice,
    margin_per_piece: b.profitPerPiece,
    margin_percent: b.targetMarginPercent,
  };
}

// ─── Exported Functions (legacy API) ──────────────────────────────

export async function calculateRecipeCost(
  recipeId: number,
): Promise<RecipeCost | null> {
  const breakdown = await getRecipeCostNew(recipeId);
  return breakdown ? adaptBreakdown(breakdown) : null;
}

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
  const result = await getScaledCostNew(recipeId, targetPieces);
  const { db } = await import("./db");
  const recipe = await db.recipes.get(recipeId);
  if (!result || !recipe) return null;

  return {
    recipe,
    cost: adaptBreakdown(result.breakdown),
    scaledQuantity: targetPieces,
    totalRevenue: result.totalRevenue,
    totalProfit: result.totalProfit,
  };
}

export async function getAllRecipeMargins(): Promise<
  Array<{
    id: number;
    name: string;
    margin: number;
    price: number;
    cost: number;
  }>
> {
  const margins = await getAllMarginsNew();
  return margins.map((m) => ({
    id: m.id,
    name: m.name,
    margin: m.marginPerPiece,
    price: m.suggestedPrice,
    cost: m.costPerPiece,
  }));
}
