import Dexie, { type Table } from "dexie";

export interface Ingredient {
  id?: number;
  name: string;
  unit: "kg" | "g" | "l" | "ml" | "pcs";
  purchase_qty: number; // e.g. 1.00
  purchase_price: number; // e.g. 100.00 (Modal)
  supplier?: string;
  updated_at: string;
}

export interface Recipe {
  id?: number;
  name: string;
  batch_yield_pcs: number; // e.g. 23
  waste_percentage: number; // e.g. 5 (%)
  packaging_cost: number; // e.g. 2.50 (Total packaging per batch)
  labor_buffer: number; // e.g. 5.00 (Utility/labor buffer per batch)
  target_margin_percent: number; // e.g. 60 (%)
  created_at: string;
}

export interface RecipeItem {
  id?: number;
  recipe_id: number;
  ingredient_id: number;
  qty_used: number; // Amount used in recipe standard batch
}

class CostDatabase extends Dexie {
  ingredients!: Table<Ingredient>;
  recipes!: Table<Recipe>;
  recipe_items!: Table<RecipeItem>;

  constructor() {
    super("CostCalculatorDB");
    this.version(1).stores({
      ingredients: "++id, name, updated_at",
      recipes: "++id, name",
      recipe_items: "++id, recipe_id, ingredient_id",
    });
  }
}

export const db = new CostDatabase();
