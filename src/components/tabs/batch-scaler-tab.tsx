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
      <Card className="mx-auto border-white/10 bg-white/5 backdrop-blur-lg sm:max-w-xl">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Recipe selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Select Recipe
            </label>
            <Select
              onValueChange={(v) => {
                setSelectedRecipeId(parseInt(v));
                setResult(null);
              }}
            >
              <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                <SelectValue placeholder="Choose a recipe..." />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900">
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
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Order Quantity (pieces)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={targetPieces}
                    onChange={(e) =>
                      setTargetPieces(parseInt(e.target.value) || 1)
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5">
                {presets.map((n) => (
                  <Badge
                    key={n}
                    variant="outline"
                    className={`cursor-pointer border-white/10 px-2.5 py-1 text-xs transition-colors hover:bg-white/10 ${
                      targetPieces === n
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-slate-400"
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
                className="w-full bg-indigo-600 hover:bg-indigo-700"
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
        <Card className="border-emerald-500/20 bg-white/5 backdrop-blur-lg">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Scale className="size-4" />
              <span>
                {targetPieces} pieces = {result.scaleFactor.toFixed(1)}× batch
                ({result.batchYield} pcs)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Cost / piece</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatCurrency(result.costPerPiece)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Price / piece</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(result.pricePerPiece)}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-slate-400">Total Revenue</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(result.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <p className="text-xs text-slate-400">Total Profit</p>
                <p className="text-lg font-bold text-indigo-400">
                  {formatCurrency(result.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!recipes?.length && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
          <CardContent className="py-12 text-center text-slate-400">
            Create recipes first to use the batch scaler.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
