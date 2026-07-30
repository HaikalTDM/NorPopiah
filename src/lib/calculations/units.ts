/**
 * Unit Conversion System
 *
 * All ingredient quantities are normalized to a base unit for consistent
 * cost calculations. Weights → grams, volumes → mL, pieces → pieces.
 *
 * This ensures a recipe using 250g of flour from a 25kg bag correctly
 * calculates the cost without manual unit conversion.
 */

export type Unit = "kg" | "g" | "l" | "ml" | "pcs";

/** Category each unit belongs to — cross-category conversion is blocked. */
type UnitCategory = "weight" | "volume" | "quantity";

const UNIT_CATEGORIES: Record<Unit, UnitCategory> = {
  kg: "weight",
  g: "weight",
  l: "volume",
  ml: "volume",
  pcs: "quantity",
};

/**
 * Conversion factors relative to the base unit of each category.
 * Base units: gram (weight), mL (volume), piece (quantity).
 */
const TO_BASE: Record<Unit, number> = {
  kg: 1000, // 1 kg = 1000 g
  g: 1,
  l: 1000, // 1 L = 1000 mL
  ml: 1,
  pcs: 1,
};

/** Display name for each unit. */
export const UNIT_LABELS: Record<Unit, string> = {
  kg: "kg",
  g: "g",
  l: "L",
  ml: "mL",
  pcs: "pcs",
};

/** All supported units. */
export const ALL_UNITS: readonly Unit[] = ["kg", "g", "l", "ml", "pcs"] as const;

/**
 * Convert a quantity from one unit to another within the same category.
 * Throws if units are from different categories (e.g., kg → ml).
 */
export function convertUnit(
  value: number,
  from: Unit,
  to: Unit,
): number {
  if (UNIT_CATEGORIES[from] !== UNIT_CATEGORIES[to]) {
    throw new Error(
      `Cannot convert ${from} to ${to}: different measurement categories (${UNIT_CATEGORIES[from]} vs ${UNIT_CATEGORIES[to]})`,
    );
  }
  const valueInBase = value * TO_BASE[from];
  return valueInBase / TO_BASE[to];
}

/**
 * Convert a quantity to its base unit (g, mL, or pcs).
 */
export function toBaseUnit(value: number, unit: Unit): number {
  return value * TO_BASE[unit];
}

/**
 * Convert a quantity FROM its base unit to the target unit.
 */
export function fromBaseUnit(value: number, unit: Unit): number {
  return value / TO_BASE[unit];
}

/**
 * Get the base unit for a given unit's category.
 */
export function getBaseUnit(unit: Unit): Unit {
  switch (UNIT_CATEGORIES[unit]) {
    case "weight":
      return "g";
    case "volume":
      return "ml";
    case "quantity":
      return "pcs";
  }
}

/**
 * Calculate cost per base unit of an ingredient.
 *
 * Example: 25kg flour at RM75 → cost per gram = 75 / (25 * 1000) = RM0.003/g
 */
export function costPerBaseUnit(
  purchasePrice: number,
  purchaseQty: number,
  purchaseUnit: Unit,
): number {
  const baseQty = toBaseUnit(purchaseQty, purchaseUnit);
  if (baseQty <= 0) return 0;
  return purchasePrice / baseQty;
}

/**
 * Calculate the cost of using a specific quantity of an ingredient,
 * automatically handling unit conversion.
 *
 * Example:
 *   Purchased 25kg flour at RM75, recipe uses 250g
 *   → ingredientUsageCost(75, 25, "kg", 250, "g") = 0.75
 */
export function ingredientUsageCost(
  purchasePrice: number,
  purchaseQty: number,
  purchaseUnit: Unit,
  usageQty: number,
  usageUnit: Unit,
): number {
  const costPerBase = costPerBaseUnit(purchasePrice, purchaseQty, purchaseUnit);
  const usageInBase = toBaseUnit(usageQty, usageUnit);
  return costPerBase * usageInBase;
}

/**
 * Format a unit with its quantity for display.
 */
export function formatQuantity(qty: number, unit: Unit): string {
  // For display, convert back to a readable unit
  if (unit === "g" && qty >= 1000) {
    return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)} kg`;
  }
  if (unit === "ml" && qty >= 1000) {
    return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)} L`;
  }
  return `${qty} ${unit}`;
}
