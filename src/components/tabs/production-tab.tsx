"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ChevronDown, ChevronUp, Factory } from "lucide-react";
import { db, type ProductionBatch, type ProductionBatchItem } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionBatchDialog } from "@/components/production-batch-dialog";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  });

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ProductionTab() {
  const batches = useLiveQuery(
    () => db.production_batches.orderBy("batch_date").reverse().toArray(),
    [],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [batchItemsCache, setBatchItemsCache] = useState<
    Map<number, ProductionBatchItem[]>
  >(new Map());

  const toggleExpand = async (batchId: number) => {
    const next = new Set(expandedIds);
    if (next.has(batchId)) {
      next.delete(batchId);
    } else {
      next.add(batchId);
      if (!batchItemsCache.has(batchId)) {
        const items = await db.production_batch_items
          .where("batch_id")
          .equals(batchId)
          .toArray();
        setBatchItemsCache((prev) => new Map(prev).set(batchId, items));
      }
    }
    setExpandedIds(next);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setBatchItemsCache(new Map());
    setExpandedIds(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {batches?.length ?? 0} batch{batches?.length !== 1 ? "es" : ""}
        </h2>
        <Button
          onClick={() => setDialogOpen(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-1 size-3.5" />
          Log Batch
        </Button>
      </div>

      {!batches?.length ? (
        <Card className="border-border bg-muted dark:bg-input">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Factory className="size-8 opacity-30" />
            <p>No production batches yet.</p>
            <p className="text-xs">
              Log actual production runs to track real costs against recipe estimates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {batches.map((batch) => {
            if (!batch.id) return null;
            const isExpanded = expandedIds.has(batch.id);
            const items = batchItemsCache.get(batch.id);

            const profitColor =
              batch.actual_profit >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-500";

            return (
              <Card
                key={batch.id}
                className="border-border bg-muted dark:bg-input"
              >
                <button
                  onClick={() => batch.id && toggleExpand(batch.id)}
                  className="w-full text-left"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {batch.recipe_name}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-border text-[11px] text-muted-foreground"
                        >
                          {formatDate(batch.batch_date)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {batch.pieces_produced} pcs · Cost:{" "}
                        {formatCurrency(batch.actual_cost_per_piece)}/pc · Price:{" "}
                        {formatCurrency(batch.actual_price_per_piece)}/pc
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${profitColor}`}>
                        <span>
                          {batch.actual_profit >= 0 ? "+" : ""}
                          {formatCurrency(batch.actual_profit)}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-2">
                    <div className="space-y-1 text-sm">
                      {items && items.length > 0 ? (
                        <>
                          {items.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-muted-foreground"
                            >
                              <span>
                                {item.ingredient_name} ({item.qty_used.toFixed(2)}{" "}
                                {item.unit})
                              </span>
                              <span>{formatCurrency(item.actual_cost)}</span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-1 mt-1" />
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No ingredient breakdown available.
                        </p>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Cost</span>
                        <span>
                          {formatCurrency(batch.actual_total_cost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Revenue</span>
                        <span>
                          {formatCurrency(batch.actual_total_revenue)}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between font-semibold ${profitColor}`}
                      >
                        <span>Profit</span>
                        <span>
                          {batch.actual_profit >= 0 ? "+" : ""}
                          {formatCurrency(batch.actual_profit)}
                        </span>
                      </div>
                      {batch.notes && (
                        <div className="border-t border-border pt-2 mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {batch.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ProductionBatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />
    </div>
  );
}
