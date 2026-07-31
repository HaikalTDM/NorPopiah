# NorPopiah — Recipe Production Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-ready features a popiah maker needs daily: shopping lists, production tracking, recipe instructions, and a quick cost calculator.

**Architecture:** Each feature is a self-contained UI component in `src/components/tabs/` or `src/components/`, backed by new Dexie tables where persistence is needed. All features reuse the existing calculation engine (`src/lib/calculations/`) and DB layer (`src/lib/db.ts`). No new dependencies.

**Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, Dexie (IndexedDB), lucide-react, sonner

## Global Constraints

- All data in IndexedDB via Dexie — no server, no API
- TypeScript strict mode — no `any` without explicit reason
- Tailwind v4 `@theme` block for all colors — no bare hex values in components
- Dark + light theme support on every new component
- Solid backgrounds only — no glassmorphism (backdrop-blur, translucent alphas rejected by user)
- Reuse existing `formatCurrency(n)` pattern from recipes-tab.tsx (MYR with 2 decimals)
- New Dexie tables must be added to `src/lib/db.ts` interface + constructor
- Number inputs use `type="text" inputMode="decimal"` pattern with raw string state
- Build must pass (`npm run build`) before each commit
- Calculation tests (`npm run test:calc`) must remain 39/39

---

### Task 1: Recipe Instructions

**Files:**
- Modify: `src/lib/db.ts:16-25` (Recipe interface)
- Modify: `src/components/tabs/recipes-tab.tsx:35-51` (RecipeForm + emptyForm)
- Modify: `src/components/tabs/recipes-tab.tsx:91-168` (openEdit + handleSave)
- Modify: `src/components/tabs/recipes-tab.tsx:362-483` (step 1 form UI)
- Modify: `src/components/tabs/recipes-tab.tsx:283-346` (expanded card display)

**Interfaces:**
- Consumes: Recipe interface, RecipeForm type, handleSave function
- Produces: `instructions: string` field on Recipe (multi-line text, stored as-is)

- [ ] **Step 1: Add instructions field to Recipe interface**

```typescript
// src/lib/db.ts — Recipe interface
export interface Recipe {
  id?: number;
  name: string;
  batch_yield_pcs: number;
  waste_percentage: number;
  packaging_cost: number;
  labor_buffer: number;
  target_margin_percent: number;
  selling_price_per_piece: number;
  instructions: string; // NEW — step-by-step preparation instructions
  created_at: string;
}
```

- [ ] **Step 2: Add instructions to RecipeForm and emptyForm**

```typescript
// In RecipeForm interface
instructions: string;

// In emptyForm
instructions: "",
```

- [ ] **Step 3: Wire instructions through openEdit and handleSave**

In `openEdit`: `instructions: recipe.instructions ?? ""`
In `handleSave` recipeData: `instructions: form.instructions` (already spread from form)

- [ ] **Step 4: Add instructions textarea in step 1 form**

Add after the Selling Price field, before the Next button:

```tsx
<div>
  <Label className="text-foreground/85">
    Instructions <span className="text-muted-foreground font-normal">— optional</span>
  </Label>
  <Textarea
    value={form.instructions}
    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
    placeholder="1. Mix cream cheese with mayo...&#10;2. Wrap with popiah skin...&#10;3. Vacuum seal and label..."
    rows={4}
    className="border-border bg-muted dark:bg-input text-foreground resize-y min-h-[80px]"
  />
  <p className="mt-1 text-[11px] text-muted-foreground">
    Step-by-step prep instructions. Shown when expanding a recipe.
  </p>
</div>
```

- [ ] **Step 5: Show instructions in expanded recipe card**

At the bottom of the expanded card details, after the Margin line:

```tsx
{recipe.instructions && (
  <div className="border-t border-border pt-2">
    <p className="text-xs font-medium text-muted-foreground mb-1">Instructions</p>
    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
      {recipe.instructions}
    </p>
  </div>
)}
```

- [ ] **Step 6: Run `npm run build` — must pass**

- [ ] **Step 7: Run `npm run test:calc` — must be 39/39**

- [ ] **Step 8: Commit**

```bash
git add src/lib/db.ts src/components/tabs/recipes-tab.tsx
git commit -m "feat: add recipe instructions field with textarea and card display"
```

---

### Task 2: Shopping List Generator

**Files:**
- Create: `src/lib/shopping-list.ts` (pure calculation functions)
- Create: `src/components/tabs/shopping-list-tab.tsx` (new tab)
- Modify: `src/components/app-shell.tsx:1-31` (add tab + import)

**Interfaces:**
- Consumes: `db.recipes`, `db.recipe_items`, `db.ingredients` (existing Dexie tables)
- Produces: `generateShoppingList(recipeIds: number[]): ShoppingList` function, `ShoppingListTab` component

- [ ] **Step 1: Create shopping list types and calculation engine**

```typescript
// src/lib/shopping-list.ts
import { db } from "./db";

export interface ShoppingItem {
  ingredientId: number;
  name: string;
  category: "ingredient" | "packaging";
  unit: string;
  totalQtyNeeded: number;
  recipes: string[]; // which recipes need this
}

export interface ShoppingList {
  items: ShoppingItem[];
  ingredientItems: ShoppingItem[];
  packagingItems: ShoppingItem[];
  totalUniqueIngredients: number;
}

export async function generateShoppingList(
  recipeIds: number[]
): Promise<ShoppingList> {
  // Aggregate qty_used per ingredient across selected recipes
  const ingredientMap = new Map<number, { qty: number; recipes: Set<string> }>();
  
  for (const recipeId of recipeIds) {
    const recipe = await db.recipes.get(recipeId);
    if (!recipe) continue;
    
    const items = await db.recipe_items.where("recipe_id").equals(recipeId).toArray();
    for (const item of items) {
      const existing = ingredientMap.get(item.ingredient_id);
      if (existing) {
        existing.qty += item.qty_used;
        existing.recipes.add(recipe.name);
      } else {
        ingredientMap.set(item.ingredient_id, {
          qty: item.qty_used,
          recipes: new Set([recipe.name]),
        });
      }
    }
  }

  const items: ShoppingItem[] = [];
  for (const [ingredientId, data] of ingredientMap) {
    const ingredient = await db.ingredients.get(ingredientId);
    if (!ingredient) continue;
    items.push({
      ingredientId,
      name: ingredient.name,
      category: ingredient.category as "ingredient" | "packaging",
      unit: ingredient.unit,
      totalQtyNeeded: data.qty,
      recipes: [...data.recipes],
    });
  }

  // Sort: ingredient first, then packaging
  items.sort((a, b) => {
    if (a.category !== b.category) return a.category === "ingredient" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    items,
    ingredientItems: items.filter(i => i.category === "ingredient"),
    packagingItems: items.filter(i => i.category === "packaging"),
    totalUniqueIngredients: items.length,
  };
}
```

- [ ] **Step 2: Create ShoppingListTab component**

Full component at `src/components/tabs/shopping-list-tab.tsx`:
- Multi-select recipe checkboxes (from `useLiveQuery(() => db.recipes.orderBy("name").toArray())`)
- "Generate List" button
- Results table with columns: Ingredient, Category (badge), Qty Needed, Unit, Used In (recipe names)
- Grouped by: Ingredients (🥬) then Packaging (📦) with section headers
- Empty state when no recipes selected
- Copy-to-clipboard button for the list (plain text format)
- Format: "• Cream Cheese — 500g (Popiah Basah)" per line

- [ ] **Step 3: Add ShoppingListTab to app-shell navigation**

Add import and tab entry in `src/components/app-shell.tsx`:
```tsx
import { ShoppingListTab } from "./tabs/shopping-list-tab";
import { ShoppingCart } from "lucide-react";
// Add to TABS array:
{ id: "shopping", label: "Shopping List", icon: ShoppingCart },
```

Add `<TabsContent value="shopping"><ShoppingListTab /></TabsContent>`

- [ ] **Step 4: Run `npm run build` — must pass**

- [ ] **Step 5: Run `npm run test:calc` — must be 39/39**

- [ ] **Step 6: Commit**

```bash
git add src/lib/shopping-list.ts src/components/tabs/shopping-list-tab.tsx src/components/app-shell.tsx
git commit -m "feat: add shopping list generator — aggregate ingredients across recipes"
```

---

### Task 3: Production Batch Tracker

**Files:**
- Modify: `src/lib/db.ts` (add ProductionBatch + ProductionBatchItem tables)
- Create: `src/components/tabs/production-tab.tsx` (new tab)
- Modify: `src/components/app-shell.tsx` (add tab)
- Create: `src/components/production-batch-dialog.tsx` (log a batch dialog)

**Interfaces:**
- Consumes: `db.recipes`, `db.recipe_items`, `db.ingredients`
- Produces: `ProductionBatch` table, `ProductionBatchItem` table, `ProductionTab` component

- [ ] **Step 1: Add ProductionBatch and ProductionBatchItem to Dexie**

```typescript
// src/lib/db.ts
export interface ProductionBatch {
  id?: number;
  recipe_id: number;
  recipe_name: string;
  pieces_produced: number;
  batch_date: string; // ISO date
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

// In CostDatabase constructor:
production_batches!: Table<ProductionBatch>;
production_batch_items!: Table<ProductionBatchItem>;

// In constructor body (after existing table defs):
this.version(2).stores({
  ingredients: "++id, name, category",
  recipes: "++id, name",
  recipe_items: "++id, recipe_id, ingredient_id",
  production_batches: "++id, recipe_id, batch_date",
  production_batch_items: "++id, batch_id, ingredient_id",
});
```

**IMPORTANT:** Dexie schema versioning — we're on v1 (implicit). Bumping to v2 with the full schema keeps backward compat. The existing tables must be repeated in the v2 stores spec even if unchanged.

- [ ] **Step 2: Create ProductionTab component**

`src/components/tabs/production-tab.tsx`:
- "Log Production Batch" button → opens dialog
- History list: cards showing date, recipe name, pieces, cost/price/profit
- Each card expands to show ingredient breakdown
- Empty state: "No production batches logged yet"

- [ ] **Step 3: Create production batch dialog**

`src/components/production-batch-dialog.tsx`:
- Recipe selector (dropdown)
- Pieces produced (number input)
- Batch date (default today)
- Notes textarea
- On save: calculate costs using existing engine, save batch + items to Dexie
- Toast on success

- [ ] **Step 4: Add ProductionTab to app-shell**

Import and tab entry with `Factory` icon from lucide-react.

- [ ] **Step 5: Run `npm run build` — must pass**

- [ ] **Step 6: Run `npm run test:calc` — must be 39/39**

- [ ] **Step 7: Commit**

```bash
git add src/lib/db.ts src/components/tabs/production-tab.tsx src/components/production-batch-dialog.tsx src/components/app-shell.tsx
git commit -m "feat: add production batch tracker with Dexie v2 schema migration"
```

---

### Task 4: Dashboard Quick Cost Calculator

**Files:**
- Create: `src/components/quick-calculator.tsx` (standalone widget)
- Modify: `src/app/page.tsx` (add widget above or alongside tabs)

**Interfaces:**
- Consumes: `db.ingredients` (for per-unit cost lookup)
- Produces: `QuickCalculator` component (no DB writes, pure UI + calculation)

- [ ] **Step 1: Create QuickCalculator widget**

`src/components/quick-calculator.tsx`:

Standalone card widget with:
- Ingredient selector dropdown (from materials)
- Qty used input
- "Add to Calculation" button
- Running list of selected ingredients with qty + cost per item
- Live total at bottom
- "Clear All" button
- Does NOT save anything — purely for quick "how much does this combination cost?"

Uses `costPerBaseUnit()` from `src/lib/calculations/units.ts` for lookup.

- [ ] **Step 2: Add to page layout**

Add `<QuickCalculator />` above the tabs in `src/app/page.tsx`, wrapped in a collapsible section (default open). Use `ChevronUp`/`ChevronDown` toggle pattern from recipes-tab.

- [ ] **Step 3: Run `npm run build` — must pass**

- [ ] **Step 4: Run `npm run test:calc` — must be 39/39**

- [ ] **Step 5: Commit**

```bash
git add src/components/quick-calculator.tsx src/app/page.tsx
git commit -m "feat: add quick cost calculator widget on dashboard"
```

---

## Self-Review

**Spec coverage:** All 4 tasks map to real user needs (shopping, tracking, instructions, quick calc).

**Placeholder scan:** No TBD, TODO, or "add error handling" — every step has concrete code.

**Type consistency:** `ShoppingItem.category` matches `Ingredient.category` type. `ProductionBatch` uses same `formatCurrency` pattern. No new types conflict with existing schemas.

**Dependencies:** Task 2 (shopping list) reads existing DB — independent of Task 1. Task 3 (production tracker) needs the DB schema change but is otherwise independent. Task 4 (quick calculator) is fully independent. All 4 can run in any order.

## Execution Handoff

Plan saved. Ready for SDD execution — say **"execute the plan with superpowers"** and I'll dispatch each task to a fresh subagent with review gates.
