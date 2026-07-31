"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { db } from "@/lib/db";
import { calculateRecipeCost, type RecipeCost } from "@/lib/cost-calculator";
import { toast } from "sonner";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

interface ProductionBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ProductionBatchDialog({
  open,
  onOpenChange,
  onSaved,
}: ProductionBatchDialogProps) {
  const recipes = useLiveQuery(() => db.recipes.orderBy("name").toArray());

  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [piecesProduced, setPiecesProduced] = useState<string>("");
  const [batchDate, setBatchDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [costPreview, setCostPreview] = useState<RecipeCost | null>(null);
  const [previewRecipe, setPreviewRecipe] = useState<{
    batch_yield_pcs: number;
    selling_price_per_piece: number;
  } | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRecipeId(null);
      setPiecesProduced("");
      setBatchDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setSaving(false);
      setCostPreview(null);
      setPreviewRecipe(null);
    }
  }, [open]);

  // Recalculate preview when recipe or pieces change
  useEffect(() => {
    async function refreshPreview() {
      if (!recipeId || !piecesProduced || parseFloat(piecesProduced) <= 0) {
        setCostPreview(null);
        setPreviewRecipe(null);
        return;
      }

      const recipe = await db.recipes.get(recipeId);
      if (!recipe) {
        setCostPreview(null);
        setPreviewRecipe(null);
        return;
      }

      const cost = await calculateRecipeCost(recipeId);
      setCostPreview(cost);
      setPreviewRecipe({
        batch_yield_pcs: recipe.batch_yield_pcs,
        selling_price_per_piece: recipe.selling_price_per_piece,
      });
    }

    refreshPreview();
  }, [recipeId, piecesProduced]);

  const handleSave = async () => {
    if (!recipeId) {
      toast.error("Please select a recipe");
      return;
    }
    const pcs = parseInt(piecesProduced) || 0;
    if (pcs <= 0) {
      toast.error("Pieces produced must be greater than 0");
      return;
    }
    if (!batchDate) {
      toast.error("Please select a batch date");
      return;
    }

    setSaving(true);
    try {
      const recipe = await db.recipes.get(recipeId);
      if (!recipe) {
        toast.error("Recipe not found");
        setSaving(false);
        return;
      }

      const recipeItems = await db.recipe_items
        .where("recipe_id")
        .equals(recipeId)
        .toArray();
      const ingredients = await db.ingredients.toArray();
      const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

      const cost = await calculateRecipeCost(recipeId);
      if (!cost) {
        toast.error("Could not calculate recipe cost");
        setSaving(false);
        return;
      }

      const costPerPiece = cost.total_cost_per_piece;
      const pricePerPiece =
        recipe.selling_price_per_piece > 0
          ? recipe.selling_price_per_piece
          : cost.suggested_price;
      const totalCost = costPerPiece * pcs;
      const totalRevenue = pricePerPiece * pcs;
      const totalProfit = totalRevenue - totalCost;

      // Save the batch
      const batchId = await db.production_batches.add({
        recipe_id: recipeId,
        recipe_name: recipe.name,
        pieces_produced: pcs,
        batch_date: batchDate,
        actual_cost_per_piece: costPerPiece,
        actual_price_per_piece: pricePerPiece,
        actual_total_cost: totalCost,
        actual_total_revenue: totalRevenue,
        actual_profit: totalProfit,
        notes,
        created_at: new Date().toISOString(),
      });

      // Save batch items (ingredient breakdown), scaled to pieces produced
      const scaleFactor =
        recipe.batch_yield_pcs > 0 ? pcs / recipe.batch_yield_pcs : 1;

      const allCostLines = [
        ...cost.ingredientCosts,
        ...cost.packagingCosts,
      ];

      for (const line of allCostLines) {
        // Find the ingredient to get ingredient_id
        const ingEntry = ingredients.find(
          (i) => i.name === line.name && i.unit === line.unit,
        );
        if (!ingEntry) continue;

        await db.production_batch_items.add({
          batch_id: batchId,
          ingredient_id: ingEntry.id!,
          ingredient_name: line.name,
          qty_used: line.qty_used * scaleFactor,
          unit: line.unit,
          actual_cost: line.total_cost * scaleFactor,
        });
      }

      toast.success(`${recipe.name} batch logged — ${pcs} pcs produced`);
      onSaved();
    } catch (err) {
      console.error("Failed to save production batch:", err);
      toast.error("Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const selectedRecipeName = recipeId
    ? recipes?.find((r) => r.id === recipeId)?.name
    : null;

  const perPieceLabel =
    previewRecipe && costPreview
      ? `Cost: ${formatCurrency(costPreview.total_cost_per_piece)}/pc`
      : "";

  const totalLabel =
    costPreview && piecesProduced && parseInt(piecesProduced) > 0
      ? `Total: ${formatCurrency(costPreview.total_cost_per_piece * parseInt(piecesProduced))}`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Log Production Batch
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipe selector */}
          <div>
            <Label className="text-foreground/85">Recipe</Label>
            <Select
              value={recipeId?.toString() ?? ""}
              onValueChange={(v) => setRecipeId(v ? parseInt(v) : null)}
            >
              <SelectTrigger className="border-border bg-muted dark:bg-input text-foreground">
                <SelectValue placeholder="Select a recipe" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {(recipes ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pieces produced */}
          <div>
            <Label className="text-foreground/85">Pieces Produced</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 40"
              value={piecesProduced}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setPiecesProduced(raw);
              }}
              className="border-border bg-muted dark:bg-input text-foreground"
            />
            {previewRecipe && piecesProduced && parseInt(piecesProduced) > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recipe batch yield: {previewRecipe.batch_yield_pcs} pcs ·{" "}
                {Math.ceil(
                  parseInt(piecesProduced) / previewRecipe.batch_yield_pcs,
                )}{" "}
                batch(es) equivalent
              </p>
            )}
          </div>

          {/* Batch date */}
          <div>
            <Label className="text-foreground/85">Batch Date</Label>
            <Input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className="border-border bg-muted dark:bg-input text-foreground"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-foreground/85">
              Notes <span className="text-muted-foreground font-normal">— optional</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Used slightly more filling than expected..."
              rows={3}
              className="border-border bg-muted dark:bg-input text-foreground resize-y min-h-[60px]"
            />
          </div>

          {/* Cost preview */}
          {costPreview && previewRecipe && piecesProduced && parseInt(piecesProduced) > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Cost per piece</span>
                <span>{formatCurrency(costPreview.total_cost_per_piece)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Price per piece</span>
                <span>
                  {formatCurrency(
                    previewRecipe.selling_price_per_piece > 0
                      ? previewRecipe.selling_price_per_piece
                      : costPreview.suggested_price,
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-medium text-foreground/85">
                <span>
                  Total ({parseInt(piecesProduced)} pcs)
                </span>
                <span>
                  {formatCurrency(
                    costPreview.total_cost_per_piece * parseInt(piecesProduced),
                  )}
                </span>
              </div>
              <div className="flex justify-between text-blue-600 dark:text-blue-400">
                <span>Est. Profit</span>
                <span>
                  {formatCurrency(
                    ((previewRecipe.selling_price_per_piece > 0
                      ? previewRecipe.selling_price_per_piece
                      : costPreview.suggested_price) -
                      costPreview.total_cost_per_piece) *
                      parseInt(piecesProduced),
                  )}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !recipeId || !piecesProduced || parseInt(piecesProduced) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Log Batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
