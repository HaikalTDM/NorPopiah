"use client";

import { useState, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, X, ChevronUp, ChevronDown, Calculator } from "lucide-react";
import { db, type Ingredient } from "@/lib/db";
import { costPerBaseUnit, toBaseUnit, type Unit } from "@/lib/calculations/units";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

interface CalcEntry {
  ingredient: Ingredient;
  qtyUsed: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  ingredient: "🥬",
  packaging: "📦",
};

export function QuickCalculator() {
  const ingredients = useLiveQuery(
    () => db.ingredients.orderBy("name").toArray(),
    [],
  );

  const [entries, setEntries] = useState<CalcEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  const selectedIngredient = useMemo(() => {
    if (!selectedId || !ingredients) return null;
    const id = parseInt(selectedId, 10);
    return ingredients.find((i) => i.id === id) ?? null;
  }, [selectedId, ingredients]);

  const totals = useMemo(() => {
    let totalCost = 0;
    let ingredientCount = 0;
    let packagingCount = 0;

    for (const entry of entries) {
      const { purchase_price, purchase_qty, unit, category } = entry.ingredient;
      const costPerBase = costPerBaseUnit(
        purchase_price,
        purchase_qty,
        unit as Unit,
      );
      const qtyInBase = toBaseUnit(entry.qtyUsed, unit as Unit);
      totalCost += costPerBase * qtyInBase;

      if (category === "ingredient") {
        ingredientCount++;
      } else {
        packagingCount++;
      }
    }

    return { totalCost, ingredientCount, packagingCount };
  }, [entries]);

  const handleAdd = useCallback(() => {
    const qty = parseFloat(qtyInput);
    if (!selectedIngredient || isNaN(qty) || qty <= 0) return;

    setEntries((prev) => [...prev, { ingredient: selectedIngredient, qtyUsed: qty }]);
    setSelectedId("");
    setQtyInput("");
  }, [selectedIngredient, qtyInput]);

  const handleRemove = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearAll = useCallback(() => {
    setEntries([]);
  }, []);

  const canAdd = selectedIngredient && qtyInput && parseFloat(qtyInput) > 0;

  return (
    <Card className="mx-auto max-w-7xl">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="size-5 text-blue-600 dark:text-blue-400" />
            Quick Cost Calculator
          </CardTitle>
          <Button variant="ghost" size="icon" className="size-8">
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Add row */}
          <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
            <div className="w-full sm:flex-1">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ingredient..." />
                </SelectTrigger>
                <SelectContent>
                  {ingredients?.map((ing) => (
                    <SelectItem key={ing.id} value={String(ing.id)}>
                      <span className="flex items-center gap-1.5">
                        <span>{CATEGORY_EMOJI[ing.category]}</span>
                        <span>{ing.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-24 sm:w-28">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Qty"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdd) {
                    handleAdd();
                  }
                }}
              />
            </div>

            <span className="flex h-10 items-center text-sm font-medium text-muted-foreground">
              {selectedIngredient?.unit ?? ""}
            </span>

            <Button
              onClick={handleAdd}
              disabled={!canAdd}
              className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {/* Entries list */}
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Add ingredients to calculate total cost
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Ingredient</span>
                <span className="w-20 text-right">Qty</span>
                <span className="w-24 text-right">Cost</span>
                <span className="w-8" />
              </div>

              {entries.map((entry, i) => {
                const costPerBase = costPerBaseUnit(
                  entry.ingredient.purchase_price,
                  entry.ingredient.purchase_qty,
                  entry.ingredient.unit as Unit,
                );
                const qtyInBase = toBaseUnit(
                  entry.qtyUsed,
                  entry.ingredient.unit as Unit,
                );
                const rowCost = costPerBase * qtyInBase;

                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 sm:grid-cols-[1fr_auto_auto_auto]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-sm">
                        {CATEGORY_EMOJI[entry.ingredient.category]}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {entry.ingredient.name}
                      </span>
                    </div>

                    <span className="text-sm text-muted-foreground sm:w-20 sm:text-right">
                      {entry.qtyUsed} {entry.ingredient.unit}
                    </span>

                    <span className="text-sm font-medium sm:w-24 sm:text-right">
                      {formatCurrency(rowCost)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(i)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })}

              {/* Total and clear */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {totals.ingredientCount > 0 && (
                      <span className="mr-2">
                        🥬 {totals.ingredientCount} ingredient
                        {totals.ingredientCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {totals.packagingCount > 0 && (
                      <span>
                        📦 {totals.packagingCount} packaging
                      </span>
                    )}
                  </span>
                  {entries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleClearAll}
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(totals.totalCost)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
