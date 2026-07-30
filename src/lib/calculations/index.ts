/**
 * Cost Calculation Engine — Barrel Export
 *
 * All UI components should import from here:
 *   import { getRecipeCost, calculateMarginPercent, ... } from "@/lib/calculations";
 */

// Units
export {
  convertUnit,
  toBaseUnit,
  fromBaseUnit,
  getBaseUnit,
  costPerBaseUnit,
  ingredientUsageCost,
  formatQuantity,
  UNIT_LABELS,
  ALL_UNITS,
} from "./units";
export type { Unit } from "./units";

// Profit & Pricing
export {
  calculateMarginPercent,
  calculateMarkupPercent,
  suggestedPriceFromMargin,
  suggestedPriceFromMarkup,
  calculateProfit,
  calculateRevenue,
  getPricingBreakdown,
} from "./profit";
export type { PricingBreakdown } from "./profit";

// Recipe Cost
export {
  calcIngredientLine,
  calcWasteCost,
  calcTotalProductionCost,
  calcCostPerPiece,
  calcRecipeCostBreakdown,
  getRecipeCost,
  getScaledRecipeCost,
  getAllRecipeMargins,
} from "./recipeCost";
export type {
  IngredientCostLine,
  RecipeCostBreakdown,
  PureRecipeInput,
} from "./recipeCost";
