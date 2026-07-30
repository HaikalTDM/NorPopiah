/**
 * Calculation Engine Test Suite
 *
 * Run: npx tsx src/lib/calculations/__tests__/verify.ts
 *
 * Verifies all pure calculation functions produce mathematically correct results.
 */

import { convertUnit, toBaseUnit, costPerBaseUnit, ingredientUsageCost } from "../units";
import {
  calculateMarginPercent,
  calculateMarkupPercent,
  suggestedPriceFromMargin,
  suggestedPriceFromMarkup,
} from "../profit";
import {
  calcWasteCost,
  calcTotalProductionCost,
  calcCostPerPiece,
} from "../recipeCost";

// ─── Test Harness ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, expected?: unknown, actual?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    if (expected !== undefined) {
      console.log(`    Expected: ${JSON.stringify(expected)}`);
      console.log(`    Actual:   ${JSON.stringify(actual)}`);
    }
    failed++;
  }
}

function approx(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}

// ─── Unit Conversion Tests ────────────────────────────────────────

console.log("\n📏 Unit Conversion");
console.log("─".repeat(50));

assert(convertUnit(1, "kg", "g") === 1000, "1 kg → 1000 g");
assert(convertUnit(1000, "g", "kg") === 1, "1000 g → 1 kg");
assert(convertUnit(250, "g", "kg") === 0.25, "250 g → 0.25 kg");
assert(convertUnit(1.5, "kg", "g") === 1500, "1.5 kg → 1500 g");
assert(convertUnit(1, "l", "ml") === 1000, "1 L → 1000 mL");
assert(convertUnit(500, "ml", "l") === 0.5, "500 mL → 0.5 L");
assert(convertUnit(10, "pcs", "pcs") === 10, "10 pcs → 10 pcs");
assert(toBaseUnit(25, "kg") === 25000, "25 kg in base (g) = 25000");
assert(toBaseUnit(500, "ml") === 500, "500 mL in base (mL) = 500");

// Cross-category should throw
let threw = false;
try { convertUnit(1, "kg", "ml"); } catch { threw = true; }
assert(threw, "kg → ml throws (cross-category)");

// ─── Cost Per Unit Tests ──────────────────────────────────────────

console.log("\n💰 Cost Per Unit");
console.log("─".repeat(50));

// 25 kg flour at RM75
assert(
  approx(costPerBaseUnit(75, 25, "kg"), 75 / 25000),
  "25kg flour @ RM75 → RM0.003/g (base unit cost)",
  75 / 25000,
  costPerBaseUnit(75, 25, "kg"),
);

assert(
  approx(costPerBaseUnit(75, 25, "kg") * 1000, 3),
  "Cost per kg = RM3/kg",
  3,
  costPerBaseUnit(75, 25, "kg") * 1000,
);

// Ingredient usage: 250g of that flour
assert(
  approx(ingredientUsageCost(75, 25, "kg", 250, "g"), 0.75),
  "250g flour from 25kg @ RM75 = RM0.75",
  0.75,
  ingredientUsageCost(75, 25, "kg", 250, "g"),
);

// 1 kg butter at RM20, use 100g
assert(
  approx(ingredientUsageCost(20, 1, "kg", 100, "g"), 2.0),
  "100g butter from 1kg @ RM20 = RM2.00",
  2.0,
  ingredientUsageCost(20, 1, "kg", 100, "g"),
);

// 500ml oil at RM8, use 30ml
assert(
  approx(ingredientUsageCost(8, 500, "ml", 30, "ml"), 0.48),
  "30ml oil from 500ml @ RM8 = RM0.48",
  0.48,
  ingredientUsageCost(8, 500, "ml", 30, "ml"),
);

// ─── Waste Calculation ────────────────────────────────────────────

console.log("\n🗑️  Waste Calculation");
console.log("─".repeat(50));

assert(
  approx(calcWasteCost(100, 5), 5),
  "5% waste on RM100 ingredient cost = RM5 waste cost",
  5,
  calcWasteCost(100, 5),
);

assert(
  approx(calcWasteCost(50, 10), 5),
  "10% waste on RM50 = RM5 waste cost",
  5,
  calcWasteCost(50, 10),
);

assert(
  calcWasteCost(100, 0) === 0,
  "0% waste = 0 waste cost",
);

// ─── Total Production Cost ────────────────────────────────────────

console.log("\n🏭 Total Production Cost");
console.log("─".repeat(50));

// Ingredients RM8.70, 5% waste, packaging RM2.50, labor RM5
// Total = 8.70 + (8.70 * 0.05) + 2.50 + 5.00 = 8.70 + 0.435 + 2.50 + 5.00 = 16.635
assert(
  approx(calcTotalProductionCost(8.70, 5, 2.50, 5.00), 16.635),
  "RM8.70 ingr + 5% waste + RM2.50 pkg + RM5 labor = RM16.635",
  16.635,
  calcTotalProductionCost(8.70, 5, 2.50, 5.00),
);

// ─── Cost Per Piece ───────────────────────────────────────────────

console.log("\n🍪 Cost Per Piece");
console.log("─".repeat(50));

assert(
  approx(calcCostPerPiece(50, 25), 2),
  "RM50 production cost / 25 pieces = RM2/pc",
  2,
  calcCostPerPiece(50, 25),
);

assert(
  calcCostPerPiece(100, 0) === 0,
  "Zero yield → zero cost per piece",
);

// ─── Margin Calculation ───────────────────────────────────────────

console.log("\n📊 Margin Calculation");
console.log("─".repeat(50));

// Cost RM4, selling RM10 → margin = (10-4)/10 = 60%
assert(
  approx(calculateMarginPercent(4, 10), 60),
  "RM4 cost, RM10 price → 60% margin",
  60,
  calculateMarginPercent(4, 10),
);

// Cost RM4, selling RM4 → margin = 0%
assert(
  calculateMarginPercent(4, 4) === 0,
  "RM4 cost, RM4 price → 0% margin",
);

// Cost RM0, selling RM10 → margin = 100%
assert(
  calculateMarginPercent(0, 10) === 100,
  "RM0 cost, RM10 price → 100% margin",
);

// ─── Markup Calculation ───────────────────────────────────────────

console.log("\n📈 Markup Calculation");
console.log("─".repeat(50));

assert(
  approx(calculateMarkupPercent(4, 10), 150),
  "RM4 cost, RM10 price → 150% markup",
  150,
  calculateMarkupPercent(4, 10),
);

// ─── Suggested Selling Price (Margin-based) ───────────────────────

console.log("\n💵 Suggested Selling Price");
console.log("─".repeat(50));

// Cost RM4, target 60% margin → price = 4 / (1 - 0.6) = 4 / 0.4 = 10
const price1 = suggestedPriceFromMargin(4, 60);
assert(
  approx(price1, 10),
  "RM4 cost + 60% margin → RM10.00 selling price",
  10,
  price1,
);

// Verify the result gives exactly 60% margin
const marginCheck = calculateMarginPercent(4, price1);
assert(
  approx(marginCheck, 60),
  "Verification: RM10.00 price on RM4 cost = 60% margin",
  60,
  marginCheck,
);

// Cost RM2, target 60% margin → 2 / 0.4 = 5
assert(
  approx(suggestedPriceFromMargin(2, 60), 5),
  "RM2 cost + 60% margin → RM5.00",
  5,
  suggestedPriceFromMargin(2, 60),
);

// Cost RM10, target 30% margin → 10 / 0.7 = 14.285...
const price2 = suggestedPriceFromMargin(10, 30);
assert(
  approx(price2, 14.286),
  "RM10 cost + 30% margin → ~RM14.29",
  14.286,
  price2,
);

// Markup-based: cost RM4, target 150% markup → 4 * 2.5 = 10
assert(
  approx(suggestedPriceFromMarkup(4, 150), 10),
  "RM4 cost + 150% markup → RM10.00",
  10,
  suggestedPriceFromMarkup(4, 150),
);

// ─── Integration Test: Complete Recipe ────────────────────────────

console.log("\n🧪 Integration: Complete Recipe");
console.log("─".repeat(50));

// Simulate a recipe:
// - 250g flour (25kg @ RM75) = RM0.75
// - 100g butter (1kg @ RM20)  = RM2.00
// - 30ml oil (500ml @ RM8)     = RM0.48
// Total ingredient: RM3.23
const flourCost = ingredientUsageCost(75, 25, "kg", 250, "g");
const butterCost = ingredientUsageCost(20, 1, "kg", 100, "g");
const oilCost = ingredientUsageCost(8, 500, "ml", 30, "ml");
const totalIngr = flourCost + butterCost + oilCost;

assert(approx(flourCost, 0.75), "Flour: RM0.75", 0.75, flourCost);
assert(approx(butterCost, 2.0), "Butter: RM2.00", 2.0, butterCost);
assert(approx(oilCost, 0.48), "Oil: RM0.48", 0.48, oilCost);
assert(approx(totalIngr, 3.23), "Total ingredient cost: RM3.23", 3.23, totalIngr);

// 5% waste, RM2.50 packaging, RM5 labor
const totalProd = calcTotalProductionCost(totalIngr, 5, 2.50, 5.00);
const wasteComponent = calcWasteCost(totalIngr, 5);
assert(approx(wasteComponent, 0.1615), "Waste: RM0.1615", 0.1615, wasteComponent);
assert(approx(totalProd, 10.8915), "Total production: RM10.89", 10.8915, totalProd);

// Yield: 20 pieces
const cpp = calcCostPerPiece(totalProd, 20);
assert(approx(cpp, 0.544575), "Cost per piece: ~RM0.545", 0.544575, cpp);

// Target 60% margin
const sellPrice = suggestedPriceFromMargin(cpp, 60);
assert(approx(sellPrice, 1.3614375), "Suggested price @ 60% margin: ~RM1.36", 1.3614375, sellPrice);

const finalMargin = calculateMarginPercent(cpp, sellPrice);
assert(approx(finalMargin, 60), "Verification: actual margin is 60%", 60, finalMargin);

// ─── Results ──────────────────────────────────────────────────────

console.log("\n" + "=".repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

if (failed > 0) {
  process.exit(1);
}
