"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Scale, Calculator } from "lucide-react";
import { db } from "@/lib/db";
import { calculateScaledCost } from "@/lib/cost-calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

export function BatchScalerTab() {
  const recipes = useLiveQuery(() => db.recipes.orderBy("name").toArray());

  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [targetPieces, setTargetPieces] = useState(50);
  const [result, setResult] = useState<{
    totalRevenue: number;
    totalProfit: number;
    costPerPiece: number;
    pricePerPiece: number;
    scaleFactor: number;
    batchYield: number;
  } | null>(null);

  const handleCalculate = async () => {
    if (!selectedRecipeId) return;

    const scaled = await calculateScaledCost(selectedRecipeId, targetPieces);
    if (!scaled) return;

    setResult({
      totalRevenue: scaled.totalRevenue,
      totalProfit: scaled.totalProfit,
      costPerPiece: scaled.cost.total_cost_per_piece,
      pricePerPiece: scaled.cost.suggested_price,
      scaleFactor: scaled.scaledQuantity / scaled.recipe.batch_yield_pcs,
      batchYield: scaled.recipe.batch_yield_pcs,
    });
  };

  const selectedRecipe = recipes?.find((r) => r.id === selectedRecipeId);

  // Quick order presets
  const presets = [10, 25, 50, 100, 200, 500];

  return (
    <div className="space-y-4">
      <Card className="mx-auto border-border bg-muted dark:bg-input sm:max-w-xl">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Recipe selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/85">
              Select Recipe
            </label>
            <Select
              onValueChange={(v) => {
                setSelectedRecipeId(parseInt(v));
                setResult(null);
              }}
            >
              <SelectTrigger className="border-border bg-muted text-foreground dark:bg-input">
                <SelectValue placeholder="Choose a recipe..." />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {(recipes ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} ({r.batch_yield_pcs} pcs/batch)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecipe && (
            <>
              {/* Target quantity */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground/85">
                  Order Quantity (pieces)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={targetPieces || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setTargetPieces(raw === "" ? 1 : parseInt(raw) || 1);
                    }}
                    className="border-border bg-muted text-foreground dark:bg-input"
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5">
                {presets.map((n) => (
                  <Badge
                    key={n}
                    variant="outline"
                    className={`cursor-pointer border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted ${
                      targetPieces === n
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      setTargetPieces(n);
                      setResult(null);
                    }}
                  >
                    {n}
                  </Badge>
                ))}
              </div>

              <Button
                onClick={handleCalculate}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Calculator className="mr-1.5 size-4" />
                Calculate
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-blue-100 bg-muted dark:border-blue-500/20 dark:bg-input">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="size-4" />
              <span>
                {targetPieces} pieces = {result.scaleFactor.toFixed(1)}× batch
                ({result.batchYield} pcs)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted p-3 dark:bg-input">
                <p className="text-xs text-muted-foreground">Cost / piece</p>
                <p className="text-lg font-semibold text-foreground/90">
                  {formatCurrency(result.costPerPiece)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3 dark:bg-input">
                <p className="text-xs text-muted-foreground">Price / piece</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(result.pricePerPiece)}
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(result.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(result.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!recipes?.length && (
        <Card className="border-border bg-muted dark:bg-input">
          <CardContent className="py-12 text-center text-muted-foreground">
            Create recipes first to use the batch scaler.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
