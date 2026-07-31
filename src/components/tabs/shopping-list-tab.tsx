"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ShoppingCart, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { db } from "@/lib/db";
import {
  generateShoppingList,
  shoppingListToText,
  type ShoppingItem,
  type ShoppingList,
} from "@/lib/shopping-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const QTY_FORMAT = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 4,
});

function formatQty(n: number): string {
  return QTY_FORMAT.format(n);
}

function categoryEmoji(category: string): string {
  return category === "packaging" ? "📦" : "🥬";
}

function categoryLabel(category: string): string {
  return category === "packaging" ? "Packaging" : "Ingredient";
}

export function ShoppingListTab() {
  const recipes = useLiveQuery(() => db.recipes.orderBy("name").toArray());

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const toggleRecipe = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!recipes) return;
    const allIds = recipes.map((r) => r.id).filter((id): id is number => id != null);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const list = await generateShoppingList(Array.from(selectedIds));
      setShoppingList(list);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shoppingList) return;
    const text = shoppingListToText(shoppingList);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Shopping list copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const hasSelection = selectedIds.size > 0;
  const recipeList = recipes ?? [];

  // --- Render helpers ---

  const renderItemRow = (item: ShoppingItem) => (
    <tr
      key={item.ingredientId}
      className="border-b border-border transition-colors hover:bg-muted/50"
    >
      <td className="px-4 py-2.5 text-sm font-medium text-foreground">
        {item.name}
      </td>
      <td className="px-4 py-2.5">
        <Badge
          variant="secondary"
          className="text-xs"
        >
          {categoryEmoji(item.category)} {categoryLabel(item.category)}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right text-sm tabular-nums text-foreground">
        {formatQty(item.totalQtyNeeded)}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">
        {item.unit}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">
        {item.recipes.join(", ")}
      </td>
    </tr>
  );

  const renderSection = (
    emoji: string,
    title: string,
    items: ShoppingItem[],
    sectionKey: string,
  ) => {
    if (items.length === 0) return null;

    const collapsed = collapsedSections.has(sectionKey);

    return (
      <div className="mt-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          {collapsed ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
          <span className="text-base">
            {emoji} {title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </button>
        {!collapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Qty Needed</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Used In</th>
                </tr>
              </thead>
              <tbody>{items.map(renderItemRow)}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // --- Empty state when no recipes exist ---
  if (recipeList.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <ShoppingCart className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No recipes yet. Create recipes in the Recipes tab to generate a shopping list.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recipe Selection */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Select Recipes
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recipeList.map((recipe) => {
              const recipeId = recipe.id;
              if (recipeId == null) return null;
              const checked = selectedIds.has(recipeId);
              return (
                <label
                  key={recipeId}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRecipe(recipeId)}
                    className="size-4 rounded border-border accent-blue-600"
                  />
                  <span className="text-sm text-foreground">{recipe.name}</span>
                </label>
              );
            })}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!hasSelection || loading}
            className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            <ShoppingCart className="mr-2 size-4" />
            {loading ? "Generating..." : "Generate List"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {shoppingList && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Shopping List{" "}
                <span className="font-normal text-muted-foreground">
                  ({shoppingList.totalUniqueIngredients} unique ingredients)
                </span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>

            {shoppingList.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No ingredients found for the selected recipes.
              </p>
            ) : (
              <div>
                {renderSection(
                  "🥬",
                  "Ingredients",
                  shoppingList.ingredientItems,
                  "ingredients",
                )}
                {renderSection(
                  "📦",
                  "Packaging",
                  shoppingList.packagingItems,
                  "packaging",
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
