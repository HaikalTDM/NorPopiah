/**
 * Profit & Pricing Calculations
 *
 * Pure functions for margin, markup, and selling price recommendations.
 * All functions are stateless — callers provide inputs.
 */

/**
 * Calculate margin percentage from cost and selling price.
 *
 * Margin = (Selling Price - Cost) / Selling Price × 100
 *
 * Example: cost RM4, selling RM10 → margin 60%
 */
export function calculateMarginPercent(cost: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
}

/**
 * Calculate markup percentage from cost and selling price.
 *
 * Markup = (Selling Price - Cost) / Cost × 100
 *
 * Example: cost RM4, selling RM10 → markup 150%
 */
export function calculateMarkupPercent(cost: number, sellingPrice: number): number {
  if (cost <= 0) return 0;
  return ((sellingPrice - cost) / cost) * 100;
}

/**
 * Calculate the selling price needed to achieve a target margin.
 *
 * Formula: Selling Price = Cost / (1 - Margin% / 100)
 *
 * Example: cost RM4, target 60% margin → RM10.00
 *
 * This is the mathematically correct margin formula.
 * DO NOT use Cost × (1 + Margin%/100) — that's markup, not margin.
 */
export function suggestedPriceFromMargin(
  costPerPiece: number,
  targetMarginPercent: number,
): number {
  if (targetMarginPercent >= 100) {
    // Margin can't exceed 100% — cap it
    targetMarginPercent = 99.99;
  }
  if (targetMarginPercent <= 0 || costPerPiece <= 0) return costPerPiece;

  const divisor = 1 - targetMarginPercent / 100;
  return costPerPiece / divisor;
}

/**
 * Calculate the selling price needed to achieve a target markup.
 *
 * Formula: Selling Price = Cost × (1 + Markup% / 100)
 *
 * Example: cost RM4, target 150% markup → RM10.00
 */
export function suggestedPriceFromMarkup(
  costPerPiece: number,
  targetMarkupPercent: number,
): number {
  return costPerPiece * (1 + targetMarkupPercent / 100);
}

/**
 * Calculate profit per piece and total profit.
 */
export function calculateProfit(
  costPerPiece: number,
  sellingPricePerPiece: number,
  quantity: number = 1,
): { profitPerPiece: number; totalProfit: number } {
  const profitPerPiece = sellingPricePerPiece - costPerPiece;
  return {
    profitPerPiece,
    totalProfit: profitPerPiece * quantity,
  };
}

/**
 * Calculate total revenue for a batch.
 */
export function calculateRevenue(
  pricePerPiece: number,
  quantity: number,
): number {
  return pricePerPiece * quantity;
}

/**
 * Complete pricing breakdown for a single item.
 */
export interface PricingBreakdown {
  costPerPiece: number;
  sellingPrice: number;
  targetMarginPercent: number;
  actualMarginPercent: number;
  markupPercent: number;
  profitPerPiece: number;
}

/**
 * Generate a full pricing breakdown.
 */
export function getPricingBreakdown(
  costPerPiece: number,
  targetMarginPercent: number,
): PricingBreakdown {
  const sellingPrice = suggestedPriceFromMargin(costPerPiece, targetMarginPercent);
  const profit = calculateProfit(costPerPiece, sellingPrice);

  return {
    costPerPiece,
    sellingPrice,
    targetMarginPercent,
    actualMarginPercent: calculateMarginPercent(costPerPiece, sellingPrice),
    markupPercent: calculateMarkupPercent(costPerPiece, sellingPrice),
    profitPerPiece: profit.profitPerPiece,
  };
}
