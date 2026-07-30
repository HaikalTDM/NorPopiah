"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { db, type Recipe, type RecipeItem, type Ingredient } from "@/lib/db";
import { calculateRecipeCost, type RecipeCost } from "@/lib/cost-calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

interface RecipeForm {
  name: string;
  batch_yield_pcs: number;
  waste_percentage: number;
  packaging_cost: number;
  labor_buffer: number;
  target_margin_percent: number;
}

const emptyForm: RecipeForm = {
  name: "",
  batch_yield_pcs: 20,
  waste_percentage: 5,
  packaging_cost: 2.5,
  labor_buffer: 5,
  target_margin_percent: 60,
};

export function RecipesTab() {
  const recipes = useLiveQuery(() => db.recipes.orderBy("name").toArray());
  const ingredients = useLiveQuery(() =>
    db.ingredients.orderBy("name").toArray(),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeForm>({ ...emptyForm });
  const [recipeItems, setRecipeItems] = useState<
    Array<{ ingredient_id: number; qty_used: number }>
  >([]);
  const [step, setStep] = useState<1 | 2>(1); // 1: recipe details, 2: ingredients

  // For displaying costs inline
  const [expandedRecipes, setExpandedRecipes] = useState<Set<number>>(
    new Set(),
  );
  const [recipeCosts, setRecipeCosts] = useState<Map<number, RecipeCost>>(
    new Map(),
  );

  const toggleExpand = async (recipeId: number) => {
    const next = new Set(expandedRecipes);
    if (next.has(recipeId)) {
      next.delete(recipeId);
    } else {
      next.add(recipeId);
      if (!recipeCosts.has(recipeId)) {
        const cost = await calculateRecipeCost(recipeId);
        if (cost) {
          setRecipeCosts((prev) => new Map(prev).set(recipeId, cost));
        }
      }
    }
    setExpandedRecipes(next);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setRecipeItems([]);
    setStep(1);
    setDialogOpen(true);
  };

  const openEdit = async (recipe: Recipe) => {
    setEditing(recipe);
    setForm({
      name: recipe.name,
      batch_yield_pcs: recipe.batch_yield_pcs,
      waste_percentage: recipe.waste_percentage,
      packaging_cost: recipe.packaging_cost,
      labor_buffer: recipe.labor_buffer,
      target_margin_percent: recipe.target_margin_percent,
    });

    if (recipe.id) {
      const items = await db.recipe_items
        .where("recipe_id")
        .equals(recipe.id)
        .toArray();
      setRecipeItems(
        items.map((i) => ({
          ingredient_id: i.ingredient_id,
          qty_used: i.qty_used,
        })),
      );
    }

    setStep(1);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Recipe name is required");
      return;
    }
    if (recipeItems.length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }

    const recipeData = {
      ...form,
      created_at: new Date().toISOString(),
    };

    if (editing?.id) {
      await db.recipes.update(editing.id, recipeData);
      // Delete old recipe items and re-add
      await db.recipe_items.where("recipe_id").equals(editing.id).delete();
      for (const item of recipeItems) {
        await db.recipe_items.add({
          recipe_id: editing.id,
          ingredient_id: item.ingredient_id,
          qty_used: item.qty_used,
        });
      }
      toast.success(`${form.name} updated`);
    } else {
      const newId = await db.recipes.add(recipeData);
      for (const item of recipeItems) {
        await db.recipe_items.add({
          recipe_id: newId,
          ingredient_id: item.ingredient_id,
          qty_used: item.qty_used,
        });
      }
      toast.success(`${form.name} created`);
    }

    setDialogOpen(false);
    setRecipeCosts(new Map()); // clear cache
  };

  const handleDelete = async (id: number, name: string) => {
    await db.recipe_items.where("recipe_id").equals(id).delete();
    await db.recipes.delete(id);
    toast.success(`${name} deleted`);
    setRecipeCosts(new Map());
  };

  const addIngredientToForm = (ingredientId: number) => {
    if (recipeItems.some((ri) => ri.ingredient_id === ingredientId)) return;
    setRecipeItems([...recipeItems, { ingredient_id: ingredientId, qty_used: 1 }]);
  };

  const updateItemQty = (index: number, qty: number) => {
    const updated = [...recipeItems];
    updated[index] = { ...updated[index], qty_used: qty };
    setRecipeItems(updated);
  };

  const removeItemFromForm = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const getIngredientName = (id: number) =>
    ingredients?.find((i) => i.id === id)?.name ?? "Unknown";

  const getIngredientUnit = (id: number) =>
    ingredients?.find((i) => i.id === id)?.unit ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">
          {recipes?.length ?? 0} recipes
        </h2>
        <Button
          onClick={openAdd}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1 size-3.5" />
          New Recipe
        </Button>
      </div>

      {!recipes?.length ? (
        <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
          <CardContent className="py-12 text-center text-slate-400">
            No recipes yet. Create your first one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {recipes.map((recipe) => {
            if (!recipe.id) return null;
            const cost = recipeCosts.get(recipe.id);
            const isExpanded = expandedRecipes.has(recipe.id);

            return (
              <Card
                key={recipe.id}
                className="border-white/10 bg-white/5 backdrop-blur-lg"
              >
                <button
                  onClick={() => recipe.id && toggleExpand(recipe.id)}
                  className="w-full"
                >
                  <CardContent className="flex items-center justify-between p-4 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-100">
                        {recipe.name}
                      </p>
                      <p className="text-sm text-slate-400">
                        Yield: {recipe.batch_yield_pcs} pcs · Margin:{" "}
                        {recipe.target_margin_percent}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cost && !isExpanded && (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          {formatCurrency(cost.suggested_price)}/pc
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(recipe);
                        }}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(recipe.id!, recipe.name);
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-400" />
                      )}
                    </div>
                  </CardContent>
                </button>

                {isExpanded && cost && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-2">
                    <div className="space-y-1 text-sm">
                      {cost.ingredientCosts.map((ic, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-slate-400"
                        >
                          <span>
                            {ic.name} ({ic.qty_used} {ic.unit})
                          </span>
                          <span>{formatCurrency(ic.total_cost)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-1 text-slate-300">
                        <span>Ingredients</span>
                        <span>
                          {formatCurrency(cost.total_ingredient_cost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Packaging</span>
                        <span>
                          {formatCurrency(cost.packaging_per_piece)}/pc
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Labor</span>
                        <span>{formatCurrency(cost.labor_per_piece)}/pc</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-100">
                        <span>Total Cost</span>
                        <span>
                          {formatCurrency(cost.total_cost_per_piece)}/pc
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-emerald-400">
                        <span>Suggested Price</span>
                        <span>{formatCurrency(cost.suggested_price)}/pc</span>
                      </div>
                      <div className="flex justify-between text-indigo-400">
                        <span>Margin</span>
                        <span>
                          {formatCurrency(cost.margin_per_piece)}/pc (
                          {cost.margin_percent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-slate-900/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editing ? "Edit Recipe" : "New Recipe"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Recipe Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Popiah Basah"
                  className="border-white/10 bg-white/5 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Batch Yield (pcs)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.batch_yield_pcs}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        batch_yield_pcs: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Waste (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.waste_percentage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        waste_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">
                    Packaging Cost (RM/batch)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.packaging_cost}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        packaging_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">
                    Labor Buffer (RM/batch)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.labor_buffer}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        labor_buffer: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">
                  Target Margin: {form.target_margin_percent}%
                </Label>
                <Input
                  type="range"
                  min="0"
                  max="200"
                  value={form.target_margin_percent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_margin_percent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="accent-emerald-500"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Next: Add Ingredients ({recipeItems.length} selected)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-200">Ingredients</h3>
                <Select
                  onValueChange={(v) => addIngredientToForm(parseInt(v))}
                >
                  <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-slate-100">
                    <SelectValue placeholder="+ Add ingredient" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-900">
                    {(ingredients ?? [])
                      .filter(
                        (i) =>
                          !recipeItems.some(
                            (ri) => ri.ingredient_id === i.id,
                          ),
                      )
                      .map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {recipeItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Select ingredients from the dropdown above
                </p>
              ) : (
                <div className="space-y-2">
                  {recipeItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <span className="flex-1 text-sm text-slate-200">
                        {getIngredientName(item.ingredient_id)}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.qty_used}
                        onChange={(e) =>
                          updateItemQty(idx, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 border-white/10 bg-white/5 text-right text-sm text-slate-100"
                      />
                      <Badge
                        variant="outline"
                        className="border-white/10 text-slate-400"
                      >
                        {getIngredientUnit(item.ingredient_id)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItemFromForm(idx)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/10 text-slate-300"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {editing ? "Update" : "Create"} Recipe
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
