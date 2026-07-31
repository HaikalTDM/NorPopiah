import Dexie, { type Table } from "dexie";

export type IngredientCategory = "ingredient" | "packaging";

export interface Ingredient {
  id?: number;
  name: string;
  unit: "kg" | "g" | "l" | "ml" | "pcs";
  purchase_qty: number;
  purchase_price: number;
  category: IngredientCategory;
  supplier?: string;
  updated_at: string;
}

export interface Recipe {
  id?: number;
  name: string;
  batch_yield_pcs: number;
  waste_percentage: number; // e.g. 5 (%)
  packaging_cost: number; // auto-calculated from packaging ingredients
  labor_buffer: number; // your time/effort per batch
  target_margin_percent: number; // e.g. 60 (%) — used only when selling_price_per_piece is 0
  selling_price_per_piece: number; // 0 = use margin slider; >0 = use this price, calculate margin
  instructions: string; // step-by-step preparation instructions
  created_at: string;
}

export interface RecipeItem {
  id?: number;
  recipe_id: number;
  ingredient_id: number;
  qty_used: number;
}

export interface ProductionBatch {
  id?: number;
  recipe_id: number;
  recipe_name: string;
  pieces_produced: number;
  batch_date: string;
  actual_cost_per_piece: number;
  actual_price_per_piece: number;
  actual_total_cost: number;
  actual_total_revenue: number;
  actual_profit: number;
  notes: string;
  created_at: string;
}

export interface ProductionBatchItem {
  id?: number;
  batch_id: number;
  ingredient_id: number;
  ingredient_name: string;
  qty_used: number;
  unit: string;
  actual_cost: number;
}

class CostDatabase extends Dexie {
  ingredients!: Table<Ingredient>;
  recipes!: Table<Recipe>;
  recipe_items!: Table<RecipeItem>;
  production_batches!: Table<ProductionBatch>;
  production_batch_items!: Table<ProductionBatchItem>;

  constructor() {
    super("CostCalculatorDB");
    this.version(1).stores({
      ingredients: "++id, name, updated_at",
      recipes: "++id, name",
      recipe_items: "++id, recipe_id, ingredient_id",
    });
    this.version(2).stores({
      ingredients: "++id, name, category, updated_at",
      recipes: "++id, name",
      recipe_items: "++id, recipe_id, ingredient_id",
    }).upgrade(tx => {
      return tx.table("ingredients").toCollection().modify(ingredient => {
        if (!ingredient.category) {
          ingredient.category = "ingredient";
        }
      });
    });
    this.version(3).stores({
      ingredients: "++id, name, category, updated_at",
      recipes: "++id, name",
      recipe_items: "++id, recipe_id, ingredient_id",
      production_batches: "++id, recipe_id, batch_date",
      production_batch_items: "++id, batch_id, ingredient_id",
    });
  }
}

export const db = new CostDatabase();
